import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, StyleSheet, Clipboard, Alert, Pressable, ActivityIndicator, Modal, Linking } from "react-native";
import { Session, User, Role } from "../constants/types";
import { colors } from "../constants/theme";
import { SectionHeader, Input, TextArea, OptionList, PrimaryButton } from "../components/UI/FormControls";
import { formatRole, apiRequest } from "../services/api";

function SystemInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.systemInfoRow}>
      <Text style={styles.systemInfoLabel}>{label}</Text>
      <Text style={styles.systemInfoValue}>{value}</Text>
    </View>
  );
}

function LockedProfileNotice({ session }: { session: Session }) {
  return (
    <View style={styles.lockedCard}>
      <View style={styles.lockedIconCircle}>
        <Text style={styles.lockedIconText}>ðŸ”’</Text>
      </View>
      <Text style={styles.lockedTitle}>Profile Restricted</Text>
      <Text style={styles.lockedMessage}>
        Profile access is restricted. Please contact Kerala Ayurvedh support to request access.
      </Text>
      <Pressable
        style={styles.requestAccessButton}
        onPress={() => {
          Linking.openURL(
            `mailto:support@keralaayurvedh.com?subject=Profile%20Access%20Request&body=Hello,%0D%0AI%20would%20like%20to%20request%20access%20to%20my%20profile.%0D%0A%0D%0AUser%20Details:%0D%0AName:%20${encodeURIComponent(session.user.name)}%0D%0APhone:%20${session.user.phone}%0D%0AUser%20ID:%20${session.user.id}`
          );
        }}
      >
        <Text style={styles.requestAccessButtonText}>Request Access</Text>
      </Pressable>
    </View>
  );
}

export function ProfileScreen({ session, onSessionUpdate }: { session: Session; onSessionUpdate?: (session: Session) => void }) {
  const displayRole = formatRole(session.user.role);
  const isCustomer = session.user.role === "CUSTOMER";
  const isProfileLocked = isCustomer && !session.user.profileUnlocked;

  const [refreshing, setRefreshing] = useState(false);

  // Upgrade requests states
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [toRole, setToRole] = useState<"LEVEL_1" | "LEVEL_2">("LEVEL_2");
  const [aadhaar, setAadhaar] = useState("");
  const [reason, setReason] = useState("");
  const [privacyConsentAccepted, setPrivacyConsentAccepted] = useState(false);
  const [submittingUpgrade, setSubmittingUpgrade] = useState(false);

  async function checkRequestStatus() {
    if (session.user.role !== "CUSTOMER") return;
    try {
      setLoadingRequest(true);
      const res = await apiRequest<{ request: any | null }>("/users/me/upgrade-request", {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setActiveRequest(res.request);
    } catch {
      // Quiet fail
    } finally {
      setLoadingRequest(false);
    }
  }

  async function refreshProfile() {
    try {
      setRefreshing(true);
      const res = await apiRequest<{ user: User }>("/users/me", {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      if (onSessionUpdate) {
        onSessionUpdate({ ...session, user: res.user });
      }
      Alert.alert("Refreshed", "Your profile details have been updated.");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not refresh profile");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleUpgradeSubmit() {
    if (!aadhaar || aadhaar.length !== 12 || /\D/.test(aadhaar)) {
      Alert.alert("Error", "Please enter a valid 12-digit Aadhaar number");
      return;
    }
    if (!reason || reason.trim().length < 5) {
      Alert.alert("Error", "Please tell us why you want to become a partner (min 5 characters)");
      return;
    }
    if (!privacyConsentAccepted) {
      Alert.alert("Privacy consent required", "Please accept the privacy consent before submitting Aadhaar details.");
      return;
    }

    try {
      setSubmittingUpgrade(true);
      const res = await apiRequest<{ request: any }>("/users/me/upgrade-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({
          toRole,
          aadhaarNumber: aadhaar,
          reason,
          privacyConsentAccepted: true
        })
      });
      Alert.alert("Success", "Your request to become an agent was submitted! Admin will review it shortly.");
      setActiveRequest(res.request);
      setPrivacyConsentAccepted(false);
      setShowUpgradeModal(false);
    } catch (err) {
      Alert.alert("Failed", err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setSubmittingUpgrade(false);
    }
  }

  async function checkProfileUnlockStatus() {
    try {
      const res = await apiRequest<{ user: User }>("/users/me", {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      if (onSessionUpdate) {
        onSessionUpdate({ ...session, user: res.user });
      }
    } catch {
      // Quiet fail
    }
  }

  useEffect(() => {
    checkRequestStatus();
    checkProfileUnlockStatus();
  }, [session.user.role]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="Profile" action={refreshing ? "Refreshing..." : "Refresh"} onAction={refreshProfile} />
      
      <View style={styles.card}>
        <View style={styles.moreProfileCardCompact}>
          <View style={styles.moreAvatar}>
            <Text style={styles.moreAvatarText}>{session.user.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.moreProfileText}>
            <Text style={styles.profileName}>{session.user.name}</Text>
            <Text style={styles.profileMeta}>
              {session.user.role === "ADMIN" ? `${displayRole} - ` : ""}{session.user.status}
            </Text>
          </View>
        </View>
        <SystemInfoRow label="Phone" value={session.user.phone} />
        {session.user.role === "ADMIN" && <SystemInfoRow label="Role" value={displayRole} />}
        <SystemInfoRow label="Status" value={session.user.status} />
        <View style={styles.systemInfoRow}>
          <Text style={styles.systemInfoLabel}>Employee ID</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: colors.slate900, fontSize: 12, fontWeight: "900" }}>{session.user.referralCode}</Text>
            <Pressable
              onPress={() => {
                Clipboard.setString(session.user.referralCode);
                Alert.alert("Copied", "Employee ID copied to clipboard!");
              }}
              style={({ pressed }) => [
                styles.copyButton,
                { opacity: pressed ? 0.6 : 1, marginLeft: 0 }
              ]}
            >
              <Text style={styles.copyButtonText}>Copy</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {isProfileLocked ? <LockedProfileNotice session={session} /> : null}

      {/* Become a Partner Section */}
      {!isProfileLocked && session.user.role === "CUSTOMER" && (
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Become a Kerala Ayurvedh Partner</Text>
          <Text style={styles.upgradeText}>
            Earn direct referral commissions of up to ₹1,000 per order, passives of ₹500, build your representative network, and unlock high-paying wellness rewards by promoting our weight loss powders!
          </Text>

          {loadingRequest ? (
            <ActivityIndicator color={colors.brand600} style={{ marginVertical: 10 }} />
          ) : activeRequest && activeRequest.status === "PENDING" ? (
            <View style={styles.pendingContainer}>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>UNDER REVIEW</Text>
              </View>
              <Text style={styles.pendingText}>
                Your request is under review. Please wait for admin approval.
              </Text>
            </View>
          ) : activeRequest && activeRequest.status === "REJECTED" ? (
            <View style={styles.rejectedContainer}>
              <View style={styles.rejectedBadge}>
                <Text style={styles.rejectedBadgeText}>DENIED</Text>
              </View>
              <Text style={styles.rejectedText}>
                Your previous application was denied. Feel free to update your details and re-apply.
              </Text>
              <Pressable style={styles.upgradeActionBtn} onPress={() => setShowUpgradeModal(true)}>
                <Text style={styles.upgradeActionBtnText}>Re-apply for Partner Status</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.upgradeActionBtn} onPress={() => setShowUpgradeModal(true)}>
              <Text style={styles.upgradeActionBtnText}>Apply for Partner Status</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Upgrade Modal */}
      {!isProfileLocked && showUpgradeModal && (
        <Modal visible={showUpgradeModal} transparent animationType="slide" onRequestClose={() => setShowUpgradeModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>Partner Application</Text>
                
                <Text style={styles.modalInputLabel}>Select Target Role</Text>
                <OptionList
                  items={[{ id: "LEVEL_2" }]}
                  selectedId={toRole}
                  emptyText="No roles available."
                  onSelect={(val) => setToRole(val as "LEVEL_1" | "LEVEL_2")}
                  renderLabel={(item) => formatRole(item.id)}
                />

                <Input label="Aadhaar Number (12 digits)" value={aadhaar} onChangeText={setAadhaar} keyboardType="numeric" maxLength={12} />
                <TextArea label="Message to Administrator" value={reason} onChangeText={setReason} />
                
                <Pressable
                  style={styles.privacyConsentRow}
                  onPress={() => setPrivacyConsentAccepted((value) => !value)}
                >
                  <View style={[styles.privacyConsentBox, privacyConsentAccepted && styles.privacyConsentBoxChecked]}>
                    <Text style={styles.privacyConsentCheck}>{privacyConsentAccepted ? "✓" : ""}</Text>
                  </View>
                  <Text style={styles.privacyConsentText}>
                    I consent to Kerala Ayurvedh collecting and using my Aadhaar number only for identity verification, application review, fraud prevention, and legal compliance.
                  </Text>
                </Pressable>
                
                <Text style={styles.modalHelpText}>
                  By submitting this application, you agree to fulfill the MLM network guidelines and confirm that all details are accurate.
                </Text>

                <PrimaryButton label="Submit Request" onPress={handleUpgradeSubmit} loading={submittingUpgrade} />
                
                <Pressable style={styles.modalCloseBtn} onPress={() => setShowUpgradeModal(false)}>
                  <Text style={styles.modalCloseBtnText}>Cancel</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16
  },
  moreProfileCardCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10
  },
  moreAvatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center"
  },
  moreAvatarText: {
    color: colors.brand800,
    fontSize: 24,
    fontWeight: "900"
  },
  moreProfileText: {
    flex: 1
  },
  profileName: {
    color: colors.slate900,
    fontSize: 20,
    fontWeight: "900"
  },
  profileMeta: {
    color: colors.slate500,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4
  },
  systemInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
    paddingVertical: 9
  },
  systemInfoLabel: {
    flex: 1,
    color: colors.slate500,
    fontSize: 12,
    fontWeight: "800"
  },
  systemInfoValue: {
    color: colors.slate900,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right"
  },
  copyButton: {
    backgroundColor: colors.brand100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8
  },
  copyButtonText: {
    color: colors.brand800,
    fontSize: 10,
    fontWeight: "900"
  },
  upgradeCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.brand200,
    padding: 18,
    marginTop: 6
  },
  upgradeTitle: {
    color: colors.brand900,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6
  },
  upgradeText: {
    color: colors.slate500,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginBottom: 14
  },
  upgradeActionBtn: {
    backgroundColor: colors.brand800,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  upgradeActionBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "900"
  },
  pendingContainer: {
    backgroundColor: colors.slate50,
    borderRadius: 8,
    padding: 12,
    alignItems: "center"
  },
  pendingBadge: {
    backgroundColor: colors.brand100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6
  },
  pendingBadgeText: {
    color: colors.brand800,
    fontSize: 11,
    fontWeight: "900"
  },
  pendingText: {
    color: colors.slate700,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center"
  },
  rejectedContainer: {
    backgroundColor: "#fff1f0",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    gap: 8
  },
  rejectedBadge: {
    backgroundColor: "#fff1f0",
    borderColor: "#ffccc7",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4
  },
  rejectedBadgeText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "900"
  },
  rejectedText: {
    color: colors.slate700,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "flex-end"
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    padding: 16
  },
  modalScroll: {
    paddingBottom: 30,
    gap: 12
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.slate900,
    marginBottom: 10
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate500,
    marginBottom: 4
  },
  privacyConsentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginVertical: 10
  },
  privacyConsentBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.slate200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  privacyConsentBoxChecked: {
    borderColor: colors.brand600,
    backgroundColor: colors.brand50
  },
  privacyConsentCheck: {
    color: colors.brand800,
    fontSize: 11,
    fontWeight: "900"
  },
  privacyConsentText: {
    flex: 1,
    fontSize: 11,
    color: colors.slate500,
    lineHeight: 15,
    fontWeight: "700"
  },
  modalHelpText: {
    fontSize: 11,
    color: colors.slate500,
    lineHeight: 15,
    fontWeight: "600",
    marginBottom: 10
  },
  modalCloseBtn: {
    paddingVertical: 12,
    alignItems: "center"
  },
  modalCloseBtnText: {
    color: colors.slate500,
    fontSize: 13,
    fontWeight: "700"
  },
  lockedContainer: {
    flex: 1,
    backgroundColor: colors.slate50,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    minHeight: 400
  },
  lockedCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.brand200,
    padding: 28,
    alignItems: "center",
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    width: "100%",
    maxWidth: 340
  },
  lockedIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.brand50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.brand100
  },
  lockedIconText: {
    fontSize: 32
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.slate900,
    marginBottom: 10,
    textAlign: "center"
  },
  lockedMessage: {
    fontSize: 14,
    color: colors.slate500,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24
  },
  requestAccessButton: {
    backgroundColor: colors.brand800,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    width: "100%"
  },
  requestAccessButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900"
  }
});
