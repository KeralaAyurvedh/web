import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Pressable,
  RefreshControl
} from "react-native";
import { Session, Commission } from "../constants/types";
import { apiRequest, formatMoney, formatDateTime } from "../services/api";
import { colors } from "../constants/theme";
import { SectionHeader, EmptyState } from "../components/UI/FormControls";

function formatCommissionType(type: string) {
  if (type === "DIRECT_LEVEL_1_JOIN") return "a3 Direct Join";
  if (type === "DIRECT_LEVEL_2_JOIN") return "a2 Direct Join";
  if (type === "UPLINE_LEVEL_2_JOIN") return "Upline Passive";
  if (type === "CUSTOMER_JOIN") return "Customer Join";
  return type.replaceAll("_", " ");
}

export function CommissionsScreen({ session }: { session: Session }) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"MONTH" | "ALL">("ALL");

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadCommissions();
    } catch {
      // Quiet fail
    } finally {
      setRefreshing(false);
    }
  }

  async function loadCommissions() {
    try {
      setLoading(true);
      const path = session.user.role === "ADMIN" ? "/commissions" : "/commissions/me";
      const res = await apiRequest<{ commissions: Commission[] }>(path, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setCommissions(res.commissions ?? []);
    } catch (error) {
      Alert.alert("Commissions", error instanceof Error ? error.message : "Could not load commissions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCommissions();
  }, []);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const filteredCommissions = commissions.filter(item => {
    if (viewMode === "ALL") return true;
    const date = new Date(item.createdAt);
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  });

  const total = filteredCommissions
    .filter(c => c.status !== "CANCELLED")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const pending = filteredCommissions
    .filter(c => c.status === "PENDING")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const paid = filteredCommissions
    .filter(c => c.status === "PAID" || c.status === "APPROVED")
    .reduce((sum, item) => sum + Number(item.amount), 0);

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
      <SectionHeader title="Earnings" />

      {/* Redesigned Card Layout */}
      <View style={styles.earningsCard}>
        <Text style={styles.earningsLabel}>Total Earnings</Text>
        <Text style={styles.earningsValue}>{formatMoney(total)}</Text>

        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleBtn, viewMode === "MONTH" && styles.toggleBtnActive]}
            onPress={() => setViewMode("MONTH")}
          >
            <Text style={[styles.toggleText, viewMode === "MONTH" && styles.toggleTextActive]}>This Month</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, viewMode === "ALL" && styles.toggleBtnActive]}
            onPress={() => setViewMode("ALL")}
          >
            <Text style={[styles.toggleText, viewMode === "ALL" && styles.toggleTextActive]}>All Time</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.splitRow}>
          <View style={styles.splitItem}>
            <Text style={styles.splitLabel}>Pending</Text>
            <Text style={styles.splitValuePending}>{formatMoney(pending)}</Text>
          </View>
          <View style={styles.splitItem}>
            <Text style={styles.splitLabel}>Paid</Text>
            <Text style={styles.splitValuePaid}>{formatMoney(paid)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>

      {loading && <ActivityIndicator color={colors.brand600} style={{ marginVertical: 12 }} />}

      {filteredCommissions.length === 0 && !loading ? (
        <EmptyState title="No transactions yet" text="Your recent commissions and payouts will appear here." />
      ) : (
        <View style={styles.transactionList}>
          {filteredCommissions.map((item) => (
            <View key={item.id} style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionTitle}>{formatCommissionType(item.type)}</Text>
                <Text style={styles.transactionDate}>{formatDateTime(item.createdAt)}</Text>
              </View>
              <View style={styles.transactionRight}>
                <Text style={styles.transactionAmount}>{formatMoney(item.amount)}</Text>
                <View style={[
                  styles.statusBadge,
                  item.status === "PENDING" ? styles.statusPending : styles.statusPaid
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    item.status === "PENDING" ? styles.statusTextPending : styles.statusTextPaid
                  ]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: colors.slate50
  },
  earningsCard: {
    backgroundColor: colors.brand900,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 24
  },
  earningsLabel: {
    color: "#d8f3de",
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center"
  },
  earningsValue: {
    color: colors.white,
    fontSize: 36,
    fontWeight: "900",
    textAlign: "center",
    marginVertical: 12
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 4,
    alignSelf: "center",
    marginBottom: 16
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  toggleBtnActive: {
    backgroundColor: colors.white
  },
  toggleText: {
    color: "#d8f3de",
    fontSize: 12,
    fontWeight: "800"
  },
  toggleTextActive: {
    color: colors.brand900,
    fontWeight: "900"
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 16
  },
  splitRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  splitItem: {
    flex: 1,
    alignItems: "center"
  },
  splitLabel: {
    color: "#d8f3de",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4
  },
  splitValuePending: {
    color: "#ffd8d3",
    fontSize: 18,
    fontWeight: "900"
  },
  splitValuePaid: {
    color: "#d8f3de",
    fontSize: 18,
    fontWeight: "900"
  },
  sectionTitle: {
    color: colors.slate900,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12
  },
  transactionList: {
    gap: 12
  },
  transactionItem: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  transactionLeft: {
    flex: 1,
    paddingRight: 12
  },
  transactionTitle: {
    color: colors.slate900,
    fontSize: 14,
    fontWeight: "900",
    textTransform: "capitalize"
  },
  transactionDate: {
    color: colors.slate500,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4
  },
  transactionRight: {
    alignItems: "flex-end"
  },
  transactionAmount: {
    color: colors.brand800,
    fontSize: 16,
    fontWeight: "900"
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6
  },
  statusPending: {
    backgroundColor: "#fffbe6"
  },
  statusPaid: {
    backgroundColor: colors.brand50
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "900"
  },
  statusTextPending: {
    color: "#d4b106"
  },
  statusTextPaid: {
    color: colors.brand800
  }
});
