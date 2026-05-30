import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Session, Handover, User, Order, PaymentHandoverStatusValue, Role } from "../constants/types";
import { apiRequest, formatMoney, formatBytes, mediaUrl } from "../services/api";
import { colors } from "../constants/theme";
import { PAYMENT_CONFIG } from "../constants/config";
import {
  Input,
  OptionList,
  PrimaryButton,
  SectionHeader,
  EmptyState
} from "../components/UI/FormControls";

export function PaymentsScreen({ session }: { session: Session }) {
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [toUserId, setToUserId] = useState("");
  const [handoverOrderId, setHandoverOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmUserId, setConfirmUserId] = useState("");
  const [confirmOrderId, setConfirmOrderId] = useState("");
  const [uploadingProofId, setUploadingProofId] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadHandovers() {
    try {
      setLoading(true);
      const result = await apiRequest<{ handovers: Handover[] }>("/payments/handovers/me", {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setHandovers(result.handovers);
    } catch (error) {
      Alert.alert("Payments", error instanceof Error ? error.message : "Could not load payments");
    } finally {
      setLoading(false);
    }
  }

  const [utrValues, setUtrValues] = useState<Record<string, string>>({});

  async function loadPaymentOptions() {
    try {
      setLoading(true);
      if (session.user.role === "CUSTOMER") {
        const [handoverResult, orderResult] = await Promise.all([
          apiRequest<{ handovers: Handover[] }>("/payments/handovers/me", {
            headers: { Authorization: `Bearer ${session.token}` }
          }),
          apiRequest<{ orders: Order[] }>("/orders", {
            headers: { Authorization: `Bearer ${session.token}` }
          })
        ]);
        setHandovers(handoverResult.handovers);
        setOrders(orderResult.orders);
      } else {
        const [handoverResult, userResult, orderResult] = await Promise.all([
          apiRequest<{ handovers: Handover[] }>("/payments/handovers/me", {
            headers: { Authorization: `Bearer ${session.token}` }
          }),
          apiRequest<{ users: User[] }>("/users/options", {
            headers: { Authorization: `Bearer ${session.token}` }
          }),
          apiRequest<{ orders: Order[] }>("/orders", {
            headers: { Authorization: `Bearer ${session.token}` }
          })
        ]);
        setHandovers(handoverResult.handovers);
        setUsers(userResult.users);
        setOrders(orderResult.orders);
      }
    } catch (error) {
      Alert.alert("Payments", error instanceof Error ? error.message : "Could not load payment options");
    } finally {
      setLoading(false);
    }
  }

  async function createCustomerHandover(orderId: string, orderAmount: string, utr: string) {
    if (!utr || utr.trim().length < 6) {
      Alert.alert("Error", "Please enter a valid UPI transaction reference ID (UTR) of at least 6 characters.");
      return;
    }
    try {
      setLoading(true);
      await apiRequest<{ handover: Handover }>("/payments/handovers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({
          orderId,
          amount: orderAmount,
          notes: `UPI Transaction ID: ${utr}`
        })
      });
      // Clear input value
      setUtrValues(prev => ({ ...prev, [orderId]: "" }));
      await loadPaymentOptions();
      Alert.alert("Payment Submitted", "Your transaction reference has been recorded successfully. Our team will verify it.");
    } catch (error) {
      Alert.alert("Payment Error", error instanceof Error ? error.message : "Could not submit payment reference");
    } finally {
      setLoading(false);
    }
  }

  async function createHandover() {
    try {
      setLoading(true);
      await apiRequest<{ handover: Handover }>("/payments/handovers", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          toUserId: session.user.role === "ADMIN" ? toUserId : undefined,
          orderId: handoverOrderId || undefined,
          amount
        })
      });
      setToUserId("");
      setHandoverOrderId("");
      setAmount("");
      await loadHandovers();
      Alert.alert("Recorded", "Payment handover recorded. Upload proof if it is not already attached.");
    } catch (error) {
      Alert.alert("Payment handover", error instanceof Error ? error.message : "Could not record handover");
    } finally {
      setLoading(false);
    }
  }

  async function confirmUserPayment() {
    try {
      setLoading(true);
      await apiRequest<{ user: User }>(`/users/${confirmUserId}/confirm-company-payment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setConfirmUserId("");
      Alert.alert("Confirmed", "User payment confirmed and commission processed.");
    } catch (error) {
      Alert.alert("Confirm user payment", error instanceof Error ? error.message : "Could not confirm user payment");
    } finally {
      setLoading(false);
    }
  }

  async function confirmOrderPayment() {
    try {
      setLoading(true);
      await apiRequest<{ order: unknown }>(`/orders/${confirmOrderId}/confirm-company-payment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setConfirmOrderId("");
      Alert.alert("Confirmed", "Order company payment confirmed.");
    } catch (error) {
      Alert.alert("Confirm order payment", error instanceof Error ? error.message : "Could not confirm order payment");
    } finally {
      setLoading(false);
    }
  }

  async function uploadPaymentProof(handoverId: string) {
    try {
      setUploadingProofId(handoverId);
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true
      });
      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      if (file.size && file.size > 2 * 1024 * 1024) {
        Alert.alert("Payment proof", "Please select a file below 2 MB.");
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: "base64"
      });

      await apiRequest<{ handover: Handover }>(`/payments/handovers/${handoverId}/proof`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          fileName: file.name ?? `payment-proof-${handoverId}`,
          mimeType: file.mimeType ?? "image/jpeg",
          base64
        })
      });

      await loadHandovers();
      Alert.alert("Payment proof", "Proof uploaded successfully.");
    } catch (error) {
      Alert.alert("Payment proof", error instanceof Error ? error.message : "Could not upload payment proof");
    } finally {
      setUploadingProofId("");
    }
  }

  async function viewProof(fileId?: string) {
    if (!fileId) {
      Alert.alert("Payment proof", "No proof file is available.");
      return;
    }
    try {
      setLoading(true);
      const result = await apiRequest<{ url: string; file: { originalName: string; mimeType: string }; expiresAt?: string | null }>(`/admin/files/${fileId}/view-url`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      await Linking.openURL(mediaUrl(result.url));
    } catch (error) {
      Alert.alert("Payment proof", error instanceof Error ? error.message : "Could not view payment proof");
    } finally {
      setLoading(false);
    }
  }

  function getMaskedName(targetUser: { id: string; name: string; role: Role } | null | undefined, isSender: boolean) {
    if (!targetUser) return isSender ? "Me" : "Receiver";
    if (targetUser.id === session.user.id) return "Me";
    
    if (session.user.role === "ADMIN") return targetUser.name;

    const rolesOrder: Record<Role, number> = {
      ADMIN: 5,
      MANAGER: 4,
      BETA_MANAGER: 4,
      LEVEL_1: 3,
      LEVEL_2: 2,
      CUSTOMER: 1
    };

    const currentRank = rolesOrder[session.user.role];
    const targetRank = rolesOrder[targetUser.role];

    if (targetRank > currentRank) {
      if (targetUser.role === "ADMIN") return "Company Admin";
      if (targetUser.role === "MANAGER" || targetUser.role === "BETA_MANAGER") return "Upline Manager";
      if (targetUser.role === "LEVEL_1") return "Upline Representative Advisor";
      if (targetUser.role === "LEVEL_2") return "Upline Representative";
    }

    return targetUser.name;
  }

  function getHolderInfo(item: Handover) {
    if (item.status === "PENDING") {
      return `Holder: ${getMaskedName(item.fromUser, true)}. Next: Upload proof or hand over to ${getMaskedName(item.toUser, false)}.`;
    }
    if (item.status === "HANDED_OVER") {
      return `Holder: Transferred. Next: ${getMaskedName(item.toUser, false)} needs to verify and approve.`;
    }
    if (item.status === "RECEIVED") {
      return `Holder: ${getMaskedName(item.toUser, false)}. Next: Company confirmation / Order released.`;
    }
    if (item.status === "DISPUTED") {
      return `Disputed. Contact Sponsor/Admin to resolve.`;
    }
    return `Completed / Cancelled.`;
  }

  function getStatusBadgeStyle(status: PaymentHandoverStatusValue) {
    if (status === "RECEIVED") return styles.badgeReceived;
    if (status === "HANDED_OVER") return styles.badgeHandedOver;
    if (status === "DISPUTED") return styles.badgeDisputed;
    if (status === "CANCELLED") return styles.badgeCancelled;
    return styles.badgePending;
  }

  useEffect(() => {
    loadPaymentOptions();
  }, []);

  if (session.user.role !== "ADMIN") {
    const pendingOrders = orders.filter(
      (order) => order.paymentStatus === "PENDING"
    );

    return (
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title="UPI Payments & Checkout" action="Refresh" onAction={loadPaymentOptions} />
        {loading && <ActivityIndicator color={colors.brand600} />}
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pay via UPI Deep Link</Text>
          <Text style={styles.mutedText}>
            Select your pending order below, tap the "Pay via UPI" button to launch your preferred payment app (GPay, PhonePe, Paytm, BHIM), and enter the Transaction ID (UTR) to record your payment instantly.
          </Text>
        </View>

        <Text style={styles.detailSectionTitle}>Pending Orders Requiring Payment</Text>
        {pendingOrders.length === 0 ? (
          <View style={[styles.card, { padding: 24, alignItems: "center" }]}>
            <Text style={styles.mutedText}>No pending orders requiring payment found.</Text>
          </View>
        ) : (
          pendingOrders.map((order) => {
            const currentUtr = utrValues[order.id] || "";
            return (
              <View key={order.id} style={styles.adminListBlock}>
                <View style={styles.handoverHeader}>
                  <Text style={styles.listTitle}>Order #{order.id.slice(-6).toUpperCase()}</Text>
                  <Text style={[styles.listTitle, { color: colors.brand800 }]}>{formatMoney(order.totalAmount)}</Text>
                </View>
                
                <Text style={styles.detailLine}>
                  Items: {order.items?.map((item) => `${item.product?.name ?? "Ayurvedic Product"} (Qty: {item.quantity})`).join(", ")}
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    { backgroundColor: colors.brand700, marginVertical: 12, borderRadius: 12, minHeight: 46, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 }
                  ]}
                  onPress={() => {
                    const upiUrl = `upi://pay?pa=${PAYMENT_CONFIG.UPI_ID}&pn=Kerala%20Ayurvedh&am=${order.totalAmount}&cu=INR&tn=Order%20${order.id.slice(-6).toUpperCase()}`;
                    Linking.openURL(upiUrl).catch(() => {
                      Alert.alert("UPI Error", "Could not open UPI payment apps. Make sure GPay, PhonePe, Paytm, or BHIM is installed.");
                    });
                  }}
                >
                  <Text style={{ color: colors.white, fontWeight: "900", fontSize: 14 }}>Pay via UPI App</Text>
                </Pressable>

                <View style={{ marginTop: 8 }}>
                  <Input
                    label="Transaction Reference ID (UTR / Txn ID)"
                    placeholder="Enter 12-digit transaction reference number"
                    value={currentUtr}
                    onChangeText={(val) => setUtrValues(prev => ({ ...prev, [order.id]: val }))}
                  />
                  <PrimaryButton
                    label="Submit UTR Reference"
                    onPress={() => createCustomerHandover(order.id, order.totalAmount, currentUtr)}
                    loading={loading}
                  />
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.detailSectionTitle}>My Payment History</Text>
        {handovers.length === 0 && !loading ? (
          <EmptyState title="No transactions yet" text="Submitted payments and approval stages will appear here." />
        ) : (
          handovers.map((item) => (
            <View key={item.id} style={styles.adminListBlock}>
              <View style={styles.handoverHeader}>
                <Text style={styles.listTitle}>{formatMoney(item.amount)}</Text>
                <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
                  <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
              </View>

              <Text style={styles.detailLine}>
                From: {getMaskedName(item.fromUser, true)} - To: {getMaskedName(item.toUser, false)}
              </Text>
              {item.order ? (
                <Text style={styles.detailLine}>
                  Order: #{item.order.id.slice(-6).toUpperCase()} ({item.order.paymentStatus.replaceAll("_", " ")})
                </Text>
              ) : null}
              {item.notes ? (
                <Text style={[styles.detailLine, { fontStyle: "italic", color: colors.brand800, marginTop: 4 }]}>
                  Notes: {item.notes}
                </Text>
              ) : null}

              <Text style={styles.holderInfoText}>{getHolderInfo(item)}</Text>
              <HandoverStepper status={item.status} orderStatus={item.order?.paymentStatus} />
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="Payment handovers" action="Refresh" onAction={loadPaymentOptions} />
      {session.user.role === "ADMIN" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Company payment confirmation</Text>
          <Text style={styles.mutedText}>Use this after money reaches company. This is what creates commissions.</Text>
          <Text style={styles.inputLabel}>User for joining commission</Text>
          <OptionList
            items={users.filter((user) => user.role !== "ADMIN" && user.role !== "MANAGER")}
            selectedId={confirmUserId}
            emptyText="Tap Refresh to load users."
            onSelect={setConfirmUserId}
            renderLabel={(user) => `${user.name} - ${user.role.replace("_", " ")}`}
          />
          <PrimaryButton label="Confirm user payment" onPress={confirmUserPayment} loading={loading} />
          <View style={styles.spacer} />
          <Text style={styles.inputLabel}>Order</Text>
          <OptionList
            items={orders}
            selectedId={confirmOrderId}
            emptyText="Tap Refresh to load orders."
            onSelect={setConfirmOrderId}
            renderLabel={(order) => `${order.customer?.name ?? "Customer"} - ${formatMoney(order.totalAmount)} - ${order.paymentStatus}`}
          />
          <PrimaryButton label="Confirm order payment" onPress={confirmOrderPayment} loading={loading} />
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Record handover</Text>
        <Text style={styles.mutedText}>
          {session.user.role === "ADMIN"
            ? "Select receiver and enter cash/UPI amount handed over."
            : "Enter the amount handed over. Receiver is selected automatically by company rules."}
        </Text>
        {session.user.role === "ADMIN" ? (
          <>
            <Text style={styles.inputLabel}>Receiver</Text>
            <OptionList
              items={users.filter((user) => user.id !== session.user.id)}
              selectedId={toUserId}
              emptyText="Tap Refresh to load receivers."
              onSelect={setToUserId}
              renderLabel={(user) => `${user.name} - ${user.role.replace("_", " ")}`}
            />
          </>
        ) : null}
        <Text style={styles.inputLabel}>Related order</Text>
        <OptionList
          items={orders}
          selectedId={handoverOrderId}
          emptyText="Tap Refresh to load orders. Leave blank only for non-order payments."
          onSelect={setHandoverOrderId}
          renderLabel={(order) => `${order.customer?.name ?? "Customer"} - ${formatMoney(order.totalAmount)} - ${order.paymentStatus}`}
        />
        <Input label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <PrimaryButton label="Record handover" onPress={createHandover} loading={loading} />
      </View>

      {handovers.length === 0 && !loading ? (
        <EmptyState title="No payment handovers yet" text="Recorded handovers and proof status will appear here." />
      ) : (
        handovers.map((item) => (
          <View key={item.id} style={styles.adminListBlock}>
            <View style={styles.handoverHeader}>
              <Text style={styles.listTitle}>{formatMoney(item.amount)}</Text>
              <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
                <Text style={styles.statusBadgeText}>{item.status}</Text>
              </View>
            </View>

            <Text style={styles.detailLine}>
              From: {getMaskedName(item.fromUser, true)} - To: {getMaskedName(item.toUser, false)}
            </Text>
            {item.order ? (
              <Text style={styles.detailLine}>
                Order: {formatMoney(item.order.totalAmount)} - {item.order.paymentStatus}
              </Text>
            ) : null}

            {/* Holder & Next Action Info */}
            <Text style={styles.holderInfoText}>{getHolderInfo(item)}</Text>

            {/* Stepper Visualization */}
            <HandoverStepper status={item.status} orderStatus={item.order?.paymentStatus} />

            <Text style={styles.detailLine}>
              Proof: {item.proofFile ? `${item.proofFile.originalName} (${formatBytes(item.proofFile.sizeBytes)})` : item.proofUrl ? "Uploaded" : "Not uploaded"}
            </Text>

            <View style={styles.actionRow}>
              {!item.proofUrl && !item.proofFile && item.status !== "RECEIVED" ? (
                <Pressable
                  style={styles.adminActionButton}
                  onPress={() => uploadPaymentProof(item.id)}
                  disabled={uploadingProofId === item.id}
                >
                  <Text style={styles.adminActionText}>
                    {uploadingProofId === item.id ? "Uploading..." : "Upload proof"}
                  </Text>
                </Pressable>
              ) : null}
              {item.proofFile && (
                <Pressable style={styles.viewProofButton} onPress={() => viewProof(item.proofFile?.id)}>
                  <Text style={styles.viewProofButtonText}>View Proof</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function HandoverStepper({ status, orderStatus }: { status: PaymentHandoverStatusValue; orderStatus?: string }) {
  const isCompanyReceived = orderStatus === "RECEIVED_BY_COMPANY" || orderStatus === "PARTIALLY_RECEIVED";
  const steps = [
    { label: "Pending", active: true },
    { label: "Handed Over", active: status === "HANDED_OVER" || status === "RECEIVED" || isCompanyReceived },
    { label: "Received", active: status === "RECEIVED" || isCompanyReceived },
    { label: "Confirmed", active: isCompanyReceived }
  ];

  return (
    <View style={styles.stepperContainer}>
      {steps.map((step, idx) => (
        <View key={step.label} style={styles.stepWrapper}>
          <View style={styles.stepUnit}>
            <View style={[styles.stepCircle, step.active ? styles.stepCircleActive : styles.stepCircleInactive]}>
              <Text style={[styles.stepCircleText, step.active ? styles.stepCircleTextActive : styles.stepCircleTextInactive]}>
                {idx + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, step.active ? styles.stepLabelActive : styles.stepLabelInactive]}>
              {step.label}
            </Text>
          </View>
          {idx < steps.length - 1 && (
            <View style={[styles.stepLine, steps[idx + 1].active ? styles.stepLineActive : styles.stepLineInactive]} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: colors.slate50
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16,
    marginBottom: 16
  },
  cardTitle: {
    color: colors.slate900,
    fontWeight: "900",
    fontSize: 17,
    marginBottom: 12
  },
  mutedText: {
    color: colors.slate500,
    lineHeight: 20,
    marginBottom: 12
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.slate700,
    marginBottom: 6
  },
  spacer: {
    height: 14
  },
  adminListBlock: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3
  },
  handoverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.brand700
  },
  listSubtitle: {
    fontSize: 12,
    color: colors.slate500
  },
  detailLine: {
    fontSize: 13,
    color: colors.slate700,
    marginBottom: 4
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.slate900,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4
  },
  holderInfoText: {
    fontSize: 12,
    color: colors.brand800,
    fontWeight: "700",
    backgroundColor: colors.brand50,
    padding: 8,
    borderRadius: 6,
    marginVertical: 10,
    lineHeight: 16
  },
  adminActionButton: {
    backgroundColor: colors.brand50,
    borderColor: colors.brand200,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  adminActionText: {
    color: colors.brand700,
    fontSize: 12,
    fontWeight: "700"
  },
  viewProofButton: {
    backgroundColor: colors.slate100,
    borderColor: colors.slate200,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  viewProofButtonText: {
    color: colors.slate700,
    fontSize: 12,
    fontWeight: "700"
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800"
  },
  badgePending: {
    backgroundColor: "#fffbeb",
    color: "#b45309"
  },
  badgeHandedOver: {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8"
  },
  badgeReceived: {
    backgroundColor: "#f0fdf4",
    color: "#15803d"
  },
  badgeDisputed: {
    backgroundColor: "#fef2f2",
    color: "#b91c1c"
  },
  badgeCancelled: {
    backgroundColor: colors.slate100,
    color: colors.slate700
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 14,
    paddingHorizontal: 4,
    width: "100%"
  },
  stepWrapper: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  stepUnit: {
    alignItems: "center",
    zIndex: 2
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5
  },
  stepCircleActive: {
    backgroundColor: colors.brand600,
    borderColor: colors.brand600
  },
  stepCircleInactive: {
    backgroundColor: colors.white,
    borderColor: colors.slate200
  },
  stepCircleText: {
    fontSize: 11,
    fontWeight: "800"
  },
  stepCircleTextActive: {
    color: colors.white
  },
  stepCircleTextInactive: {
    color: colors.slate500
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 4,
    position: "absolute",
    top: 24,
    width: 60,
    textAlign: "center"
  },
  stepLabelActive: {
    color: colors.brand800
  },
  stepLabelInactive: {
    color: colors.slate500
  },
  stepLine: {
    height: 2,
    flex: 1,
    marginHorizontal: -12,
    marginTop: -12,
    zIndex: 1
  },
  stepLineActive: {
    backgroundColor: colors.brand500
  },
  stepLineInactive: {
    backgroundColor: colors.slate200
  }
});
