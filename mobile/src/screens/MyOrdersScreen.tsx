import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl
} from "react-native";
import { Session, Order } from "../constants/types";
import { colors } from "../constants/theme";
import { apiRequest, formatMoney } from "../services/api";
import { SectionHeader, EmptyState } from "../components/UI/FormControls";

export function MyOrdersScreen({ session }: { session: Session }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadOrders();
    } catch {
      // Quiet fail
    } finally {
      setRefreshing(false);
    }
  }

  async function loadOrders() {
    try {
      setLoading(true);
      const result = await apiRequest<{ orders: Order[] }>("/orders", {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setOrders(result.orders);
    } catch (error) {
      Alert.alert("Orders", error instanceof Error ? error.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  function toggleExpand(orderId: string) {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.brand700]}
          tintColor={colors.brand700}
        />
      }
    >
      <SectionHeader title="My Orders" />
      
      {loading && <ActivityIndicator color={colors.brand600} style={{ marginVertical: 12 }} />}

      {orders.length === 0 && !loading ? (
        <EmptyState
          title="No Orders Found"
          text="Your natural Ayurvedic product orders will appear here once they are placed."
        />
      ) : (
        orders.map((order) => {
          const isExpanded = expandedOrderId === order.id;
          return (
            <View key={order.id} style={styles.orderCard}>
              <Pressable style={styles.orderHeader} onPress={() => toggleExpand(order.id)}>
                <View>
                  <Text style={styles.orderTitle}>Order #{order.id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.orderDate}>
                    {order.customer ? `Customer: ${order.customer.name}` : ""}
                  </Text>
                </View>
                <View style={styles.rightAlign}>
                  <Text style={styles.orderTotal}>{formatMoney(order.totalAmount)}</Text>
                  <View style={[styles.statusBadge, order.paymentStatus === "RECEIVED_BY_COMPANY" ? styles.badgeReceived : styles.badgePending]}>
                    <Text style={styles.statusBadgeText}>{order.paymentStatus.replaceAll("_", " ")}</Text>
                  </View>
                </View>
              </Pressable>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Pipeline Stage: <Text style={styles.summaryVal}>{order.status.replaceAll("_", " ")}</Text>
                </Text>
                <Pressable onPress={() => toggleExpand(order.id)}>
                  <Text style={styles.expandText}>{isExpanded ? "Hide Details ▲" : "Show Details ▼"}</Text>
                </Pressable>
              </View>

              {isExpanded && (
                <View style={styles.detailsBox}>
                  <Text style={styles.sectionTitle}>Items Ordered</Text>
                  {order.items?.map((item: any, idx: number) => (
                    <Text key={idx} style={styles.itemLine}>
                      • {item.product?.name ?? "Ayurvedic Product"} (Qty: {item.quantity})
                    </Text>
                  ))}

                  <Text style={styles.sectionTitle}>Order Progress Tracker</Text>
                  <OrderPipelineStepper status={order.status} />
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function OrderPipelineStepper({ status }: { status: string }) {
  const stages = [
    { key: "CREATED", label: "Created" },
    { key: "MONEY_RECEIVED_BY_COMPANY", label: "Paid" },
    { key: "PRODUCT_RELEASED_BY_COMPANY", label: "Shipped" },
    { key: "DELIVERED_TO_CUSTOMER", label: "Delivered" }
  ];

  const statusIndex = stages.findIndex((s) => s.key === status);
  const activeIndex = statusIndex !== -1 ? statusIndex : 0;

  // Let's coerce standard progression:
  let finalIndex = activeIndex;
  if (status.startsWith("MONEY_") && status !== "MONEY_RECEIVED_BY_COMPANY") {
    finalIndex = 0; // Still collecting money
  } else if (status.startsWith("PRODUCT_") && status !== "PRODUCT_RELEASED_BY_COMPANY") {
    finalIndex = 2; // Product traveling down to agent
  } else if (status === "DELIVERED_TO_CUSTOMER") {
    finalIndex = 3;
  }

  return (
    <View style={styles.stepperContainer}>
      {stages.map((stage, idx) => {
        const active = idx <= finalIndex;
        return (
          <View key={stage.key} style={styles.stepWrapper}>
            <View style={styles.stepUnit}>
              <View style={[styles.stepCircle, active ? styles.stepCircleActive : styles.stepCircleInactive]}>
                <Text style={[styles.stepCircleText, active ? styles.stepCircleTextActive : styles.stepCircleTextInactive]}>
                  {idx + 1}
                </Text>
              </View>
              <Text style={[styles.stepLabel, active ? styles.stepLabelActive : styles.stepLabelInactive]}>
                {stage.label}
              </Text>
            </View>
            {idx < stages.length - 1 && (
              <View style={[styles.stepLine, idx < finalIndex ? styles.stepLineActive : styles.stepLineInactive]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: colors.slate50
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.slate900
  },
  orderDate: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
    fontWeight: "700"
  },
  rightAlign: {
    alignItems: "flex-end",
    gap: 4
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.brand800
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: colors.white
  },
  badgePending: {
    backgroundColor: colors.slate500
  },
  badgeReceived: {
    backgroundColor: colors.brand600
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate100,
    marginVertical: 12
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.slate700,
    fontWeight: "700"
  },
  summaryVal: {
    color: colors.brand700,
    fontWeight: "900"
  },
  expandText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.brand600
  },
  detailsBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate100
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.slate900,
    marginBottom: 8,
    marginTop: 8
  },
  itemLine: {
    fontSize: 13,
    color: colors.slate700,
    fontWeight: "700",
    paddingVertical: 2
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
