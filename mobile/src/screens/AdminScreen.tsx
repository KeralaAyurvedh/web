import React, { useState, useMemo, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  Share,
  StyleSheet
} from "react-native";
import { File, Paths } from "expo-file-system";
import {
  Session,
  Role,
  User,
  Matrix,
  AdminStats,
  Commission,
  Order,
  Handover,
  AuditLog,
  AdminRequest,
  MemberApplication,
  AdminSection,
  UserStatus,
  OrderStatus,
  PaymentStatus,
  CommissionStatusValue,
  PaymentHandoverStatusValue,
  AdminUserDetail,
  DatabaseStats,
  UploadStorageStats,
  SystemHealth,
  BackupStatus,
  DatabaseTableStat,
  CountAmountRow,
  AdminReport,
  BackendHelpTopic,
  HelpTopicRole,
  HelpTopicCategory
} from "../constants/types";
import {
  apiRequest,
  formatMoney,
  formatBytes,
  formatDateTime,
  buildReportText,
  mediaUrl,
  confirmAction,
  formatRole as formatRoleBase,
  API_URL
} from "../services/api";

const formatRole = (role?: string | null) => formatRoleBase(role, true);
import { colors } from "../constants/theme";
import {
  Input,
  TextArea,
  OptionList,
  PrimaryButton,
  SectionHeader,
  MetricCard,
  ListItem,
  TreeUserRow,
  EmptyState
} from "../components/UI/FormControls";
import {
  adminSections,
  userStatusOptions,
  orderStatusOptions,
  paymentStatusOptions,
  commissionStatusOptions,
  parseHelpSteps,
  helpTopicRoleOptions,
  helpTopicCategoryOptions,
  helpRouteOptions
} from "../constants/guides";

function validateStrongPassword(password: string) {
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
    return "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";
  }
  return "";
}

export function AdminScreen({
  session,
  onSessionUpdate
}: {
  session: Session;
  onSessionUpdate?: (session: Session) => void;
}) {
  const [adminSection, setAdminSection] = useState<AdminSection>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<AdminRequest[]>([]);
  const [reassignmentRequests, setReassignmentRequests] = useState<AdminRequest[]>([]);
  const [applications, setApplications] = useState<MemberApplication[]>([]);
  const [report, setReport] = useState<AdminReport | null>(null);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [storageStats, setStorageStats] = useState<UploadStorageStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [systemError, setSystemError] = useState("");
  const [systemUpdatedAt, setSystemUpdatedAt] = useState("");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [systemTableSearch, setSystemTableSearch] = useState("");
  const [applicationFilter, setApplicationFilter] = useState<"ALL" | MemberApplication["status"]>("PENDING");
  const [applicationPassword, setApplicationPassword] = useState("Welcome@123");
  const [applicationSponsorId, setApplicationSponsorId] = useState("");
  const [applicationRejectReason, setApplicationRejectReason] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "ALL">("ALL");
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);
  const [orderFilter, setOrderFilter] = useState<PaymentStatus | "ALL">("ALL");
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<OrderStatus>("MONEY_RECEIVED_BY_COMPANY");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus>("RECEIVED_BY_COMPANY");
  const [commissionFilter, setCommissionFilter] = useState<CommissionStatusValue | "ALL">("ALL");
  const [commissionSearch, setCommissionSearch] = useState("");
  const [handoverFilter, setHandoverFilter] = useState<string>("ALL");
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);
  const [selectedMatrixId, setSelectedMatrixId] = useState("");
  const [manualReceiverId, setManualReceiverId] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [upgradeUserId, setUpgradeUserId] = useState("");
  const [upgradeRole, setUpgradeRole] = useState<Role>("LEVEL_2");
  const [upgradeSponsorId, setUpgradeSponsorId] = useState("");
  const [reassignUserId, setReassignUserId] = useState("");
  const [reassignSponsorId, setReassignSponsorId] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loginIdPassword, setLoginIdPassword] = useState("");
  const [newLoginId, setNewLoginId] = useState(session.user.phone);
  const [selectedUserNewPassword, setSelectedUserNewPassword] = useState("Welcome@123");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    return users.filter((user) => {
      const textMatches = !term || `${user.name} ${user.phone} ${user.referralCode}`.toLowerCase().includes(term);
      const roleMatches = roleFilter === "ALL" || user.role === roleFilter;
      const statusMatches = statusFilter === "ALL" || user.status === statusFilter;
      return textMatches && roleMatches && statusMatches;
    });
  }, [roleFilter, statusFilter, userSearch, users]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === "ALL") return orders;
    return orders.filter((order) => order.paymentStatus === orderFilter);
  }, [orderFilter, orders]);

  const filteredCommissions = useMemo(() => {
    const term = commissionSearch.trim().toLowerCase();
    return commissions.filter((commission) => {
      const statusMatches = commissionFilter === "ALL" || commission.status === commissionFilter;
      const textMatches = !term || `${commission.receiver?.name ?? ""} ${commission.sourceUser?.name ?? ""} ${commission.type}`.toLowerCase().includes(term);
      return statusMatches && textMatches;
    });
  }, [commissionFilter, commissionSearch, commissions]);

  const filteredHandovers = useMemo(() => {
    if (handoverFilter === "ALL") return handovers;
    return handovers.filter((handover) => handover.status === handoverFilter);
  }, [handoverFilter, handovers]);

  const filteredApplications = useMemo(() => {
    if (applicationFilter === "ALL") return applications;
    return applications.filter((application) => application.status === applicationFilter);
  }, [applicationFilter, applications]);

  const filteredSystemTables = useMemo(() => {
    const term = systemTableSearch.trim().toLowerCase();
    if (!databaseStats) return [];
    return databaseStats.tables.filter((table) => !term || table.tableName.toLowerCase().includes(term));
  }, [databaseStats, systemTableSearch]);

  async function loadSystemMonitor(showLoader = true) {
    try {
      if (showLoader) setLoading(true);
      setSystemError("");
      const [databaseResult, storageResult, healthResult, backupResult] = await Promise.all([
        apiRequest<DatabaseStats>("/admin/system/database-stats", {
          headers: { Authorization: `Bearer ${session.token}` }
        }),
        apiRequest<UploadStorageStats>("/admin/system/storage-stats", {
          headers: { Authorization: `Bearer ${session.token}` }
        }),
        apiRequest<SystemHealth>("/admin/system/health", {
          headers: { Authorization: `Bearer ${session.token}` }
        }),
        apiRequest<BackupStatus>("/admin/system/backup-status", {
          headers: { Authorization: `Bearer ${session.token}` }
        })
      ]);
      setDatabaseStats(databaseResult);
      setStorageStats(storageResult);
      setSystemHealth(healthResult);
      setBackupStatus(backupResult);
      setSystemUpdatedAt(new Date().toISOString());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load system monitor";
      setSystemError(message.toLowerCase().includes("forbidden") ? "You do not have permission to view system monitor." : message);
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  async function loadAdminPanel() {
    try {
      setLoading(true);
      const [
        statsResult,
        usersResult,
        commissionsResult,
        ordersResult,
        handoversResult,
        logsResult,
        upgradesResult,
        reassignmentsResult,
        applicationsResult,
        reportResult
      ] = await Promise.all([
        apiRequest<{ stats: AdminStats }>("/admin/dashboard", {
          headers: { Authorization: `Bearer ${session.token}` }
        }),
        apiRequest<{ users: User[] }>("/users", {
          headers: { Authorization: `Bearer ${session.token}` }
        }),
        apiRequest<{ commissions: Commission[] }>("/commissions", {
          headers: { Authorization: `Bearer ${session.token}` }
        }),
        apiRequest<{ orders: Order[] }>("/orders", {
          headers: { Authorization: `Bearer ${session.token}` }
        }),
        apiRequest<{ handovers: Handover[] }>("/admin/payment-handovers", {
          headers: { Authorization: `Bearer ${session.token}` }
        }),
        apiRequest<{ logs: AuditLog[] }>("/admin/audit-logs", {
          headers: { Authorization: `Bearer ${session.token}` }
        }),
        apiRequest<{ requests: AdminRequest[] }>("/admin/upgrade-requests", {
          headers: { Authorization: `Bearer ${session.token}` }
        }),
        apiRequest<{ requests: AdminRequest[] }>("/admin/reassignment-requests", {
          headers: { Authorization: `Bearer ${session.token}` }
        }),
        apiRequest<{ applications: MemberApplication[] }>("/admin/applications", {
          headers: { Authorization: `Bearer ${session.token}` }
        }),
        apiRequest<{ report: AdminReport }>("/admin/reports", {
          headers: { Authorization: `Bearer ${session.token}` }
        })
      ]);
      setStats(statsResult.stats);
      setUsers(usersResult.users);
      setCommissions(commissionsResult.commissions);
      setOrders(ordersResult.orders);
      setHandovers(handoversResult.handovers);
      setAuditLogs(logsResult.logs);
      setUpgradeRequests(upgradesResult.requests);
      setReassignmentRequests(reassignmentsResult.requests);
      setApplications(applicationsResult.applications);
      setReport(reportResult.report);
      await loadSystemMonitor(false);
    } catch (error) {
      Alert.alert("Admin panel", error instanceof Error ? error.message : "Could not load admin panel");
    } finally {
      setLoading(false);
    }
  }

  async function updateUserStatus(userId: string, status: UserStatus) {
    try {
      setLoading(true);
      await apiRequest<{ user: User }>(`/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ status })
      });
      await loadAdminPanel();
    } catch (error) {
      Alert.alert("User status", error instanceof Error ? error.message : "Could not update user");
    } finally {
      setLoading(false);
    }
  }

  function requestUserStatusUpdate(userId: string, status: UserStatus) {
    if (status === "SUSPENDED" || status === "TERMINATED") {
      confirmAction("Change user status", `This will mark the user as ${status}. Continue?`, () => updateUserStatus(userId, status));
      return;
    }
    updateUserStatus(userId, status);
  }

  async function resetSelectedUserPassword(userId: string) {
    const passwordError = validateStrongPassword(selectedUserNewPassword);
    if (passwordError) {
      Alert.alert("Password reset", passwordError);
      return;
    }

    try {
      setLoading(true);
      const result = await apiRequest<{ credentials: { phone: string; password: string } }>(`/admin/users/${userId}/reset-password`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ password: selectedUserNewPassword })
      });
      await loadAdminPanel();
      Alert.alert("Password reset", `Login phone: ${result.credentials.phone}\nPassword: ${result.credentials.password}`);
    } catch (error) {
      Alert.alert("Password reset", error instanceof Error ? error.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  }

  function requestSelectedUserPasswordReset(userId: string) {
    confirmAction("Reset user password", "This will replace the user's current password.", () => resetSelectedUserPassword(userId));
  }

  async function confirmSelectedUserCompanyPayment(userId: string) {
    try {
      setLoading(true);
      const result = await apiRequest<{ user: AdminUserDetail }>(`/users/${userId}/confirm-company-payment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` }
      });
      await loadAdminPanel();
      await loadUserDetail(userId);
      Alert.alert("Payment confirmed", `${result.user.name} is confirmed and commissions were processed.`);
    } catch (error) {
      Alert.alert("Joining payment", error instanceof Error ? error.message : "Could not confirm payment");
    } finally {
      setLoading(false);
    }
  }

  function requestSelectedUserPaymentConfirmation(userId: string) {
    confirmAction("Confirm joining payment", "Use this only after money reaches the company. This creates joining commissions.", () => confirmSelectedUserCompanyPayment(userId));
  }

  async function toggleProfileAccess(userId: string, currentStatus: boolean) {
    try {
      setLoading(true);
      const result = await apiRequest<{ user: AdminUserDetail }>(`/admin/users/${userId}/profile-access`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ profileUnlocked: !currentStatus })
      });
      setSelectedUser(result.user);
      Alert.alert("Profile Security", `Profile successfully ${!currentStatus ? "unblocked" : "blocked"}.`);
    } catch (error) {
      Alert.alert("Profile Security", error instanceof Error ? error.message : "Could not toggle profile access");
    } finally {
      setLoading(false);
    }
  }

  async function loadUserDetail(userId: string) {
    try {
      setLoading(true);
      const result = await apiRequest<{ user: AdminUserDetail }>(`/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setSelectedUser(result.user);
    } catch (error) {
      Alert.alert("User detail", error instanceof Error ? error.message : "Could not load user detail");
    } finally {
      setLoading(false);
    }
  }

  async function markCommissionPaid(commissionId: string) {
    try {
      setLoading(true);
      await apiRequest<{ commission: Commission }>(`/admin/commissions/${commissionId}/paid`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` }
      });
      await loadAdminPanel();
      Alert.alert("Commission", "Commission marked as paid.");
    } catch (error) {
      Alert.alert("Commission", error instanceof Error ? error.message : "Could not mark paid");
    } finally {
      setLoading(false);
    }
  }

  function requestMarkCommissionPaid(commissionId: string) {
    confirmAction("Mark commission paid", "Confirm only after payout is completed.", () => markCommissionPaid(commissionId));
  }

  async function updateOrderStatus() {
    try {
      setLoading(true);
      await apiRequest<{ order: Order }>(`/admin/orders/${selectedOrderId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ status: selectedOrderStatus, paymentStatus: selectedPaymentStatus })
      });
      setSelectedOrderId("");
      await loadAdminPanel();
    } catch (error) {
      Alert.alert("Order status", error instanceof Error ? error.message : "Could not update order");
    } finally {
      setLoading(false);
    }
  }

  function requestUpdateOrderStatus() {
    if (!selectedOrderId) {
      Alert.alert("Select order", "Choose an order before updating status.");
      return;
    }
    const dangerous = selectedOrderStatus === "CANCELLED" || selectedPaymentStatus === "CANCELLED" || selectedPaymentStatus === "DISPUTED";
    if (dangerous) {
      const message = selectedOrderStatus === "CANCELLED"
        ? "This will cancel the order and return the ordered quantities back to product stock. Continue?"
        : "This is a sensitive order/payment status change. Continue?";
      confirmAction("Update order", message, updateOrderStatus);
      return;
    }
    updateOrderStatus();
  }

  async function updateCommissionStatus(commissionId: string, status: CommissionStatusValue) {
    try {
      setLoading(true);
      await apiRequest<{ commission: Commission }>(`/admin/commissions/${commissionId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ status })
      });
      await loadAdminPanel();
    } catch (error) {
      Alert.alert("Commission", error instanceof Error ? error.message : "Could not update commission");
    } finally {
      setLoading(false);
    }
  }

  function requestCommissionStatusUpdate(commissionId: string, status: CommissionStatusValue) {
    if (status === "CANCELLED" || status === "ADJUSTED" || status === "PAID") {
      confirmAction("Update commission", `Change this commission to ${status}?`, () => updateCommissionStatus(commissionId, status));
      return;
    }
    updateCommissionStatus(commissionId, status);
  }

  async function createManualCommission() {
    try {
      setLoading(true);
      await apiRequest<{ commission: Commission }>("/admin/commissions/manual", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ receiverId: manualReceiverId, amount: manualAmount, notes: manualNotes })
      });
      setManualReceiverId("");
      setManualAmount("");
      setManualNotes("");
      await loadAdminPanel();
    } catch (error) {
      Alert.alert("Manual commission", error instanceof Error ? error.message : "Could not create adjustment");
    } finally {
      setLoading(false);
    }
  }

  function requestCreateManualCommission() {
    confirmAction("Manual commission", "This will create an approved manual commission adjustment.", createManualCommission);
  }

  async function createUpgradeRequest() {
    try {
      setLoading(true);
      await apiRequest<{ request: AdminRequest }>("/admin/upgrade-requests", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          requesterId: upgradeUserId,
          toRole: upgradeRole,
          targetSponsorId: upgradeRole === "MANAGER" ? undefined : upgradeSponsorId,
          reason: "Admin-created upgrade"
        })
      });
      setUpgradeUserId("");
      setUpgradeSponsorId("");
      await loadAdminPanel();
    } catch (error) {
      Alert.alert("Role upgrade", error instanceof Error ? error.message : "Could not create upgrade");
    } finally {
      setLoading(false);
    }
  }

  async function decideUpgradeRequest(requestId: string, decision: "APPROVED" | "REJECTED" | "CANCELLED") {
    try {
      setLoading(true);
      const result = await apiRequest<{ ok: boolean; emailSent?: boolean; emailReason?: string }>(`/admin/upgrade-requests/${requestId}/decision`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ decision })
      });
      await loadAdminPanel();
      Alert.alert(
        "Role upgrade",
        [
          `Decision: ${decision}`,
          `Email: ${result.emailSent ? "Sent" : "Not sent"}`,
          result.emailSent ? "" : `Reason: ${result.emailReason ?? "Unknown email error"}`
        ].filter(Boolean).join("\n")
      );
    } catch (error) {
      Alert.alert("Role upgrade", error instanceof Error ? error.message : "Could not decide request");
    } finally {
      setLoading(false);
    }
  }

  function requestUpgradeDecision(requestId: string, decision: "APPROVED" | "REJECTED" | "CANCELLED") {
    confirmAction("Role upgrade decision", `${decision} this role upgrade request?`, () => decideUpgradeRequest(requestId, decision));
  }

  async function createReassignmentRequest() {
    try {
      setLoading(true);
      await apiRequest<{ request: AdminRequest }>("/admin/reassignment-requests", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          subjectUserId: reassignUserId,
          toSponsorId: reassignSponsorId,
          reason: "Admin-created reassignment"
        })
      });
      setReassignUserId("");
      setReassignSponsorId("");
      await loadAdminPanel();
    } catch (error) {
      Alert.alert("Reassignment", error instanceof Error ? error.message : "Could not create reassignment");
    } finally {
      setLoading(false);
    }
  }

  async function decideReassignmentRequest(requestId: string, decision: "APPROVED" | "REJECTED" | "CANCELLED") {
    try {
      setLoading(true);
      await apiRequest<{ ok: boolean }>(`/admin/reassignment-requests/${requestId}/decision`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ decision })
      });
      await loadAdminPanel();
    } catch (error) {
      Alert.alert("Reassignment", error instanceof Error ? error.message : "Could not decide request");
    } finally {
      setLoading(false);
    }
  }

  function requestReassignmentDecision(requestId: string, decision: "APPROVED" | "REJECTED" | "CANCELLED") {
    confirmAction("Sponsor reassignment", `${decision} this sponsor reassignment request?`, () => decideReassignmentRequest(requestId, decision));
  }

  async function updatePaymentHandoverStatus(handoverId: string, status: PaymentHandoverStatusValue) {
    try {
      setLoading(true);
      await apiRequest<{ handover: Handover }>(`/admin/payment-handovers/${handoverId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ status })
      });
      await loadAdminPanel();
    } catch (error) {
      Alert.alert("Payment handover", error instanceof Error ? error.message : "Could not update handover");
    } finally {
      setLoading(false);
    }
  }

  function requestPaymentHandoverStatus(handoverId: string, status: PaymentHandoverStatusValue) {
    const message =
      status === "RECEIVED"
        ? "Confirm this only after company has received the money."
        : `Mark this payment handover as ${status}?`;
    confirmAction("Payment handover", message, () => updatePaymentHandoverStatus(handoverId, status));
  }

  async function openPaymentProof(fileId?: string) {
    if (!fileId) {
      Alert.alert("Payment proof", "No proof file is available for this handover.");
      return;
    }

    try {
      setLoading(true);
      const result = await apiRequest<{ url: string; file: { originalName: string; mimeType: string }; expiresAt?: string | null }>(`/admin/files/${fileId}/view-url`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      await Linking.openURL(mediaUrl(result.url));
    } catch (error) {
      Alert.alert("Payment proof", error instanceof Error ? error.message : "Could not open payment proof");
    } finally {
      setLoading(false);
    }
  }

  async function loadReport() {
    try {
      setLoading(true);
      const params = [
        reportFrom ? `from=${encodeURIComponent(reportFrom)}` : "",
        reportTo ? `to=${encodeURIComponent(reportTo)}` : ""
      ].filter(Boolean).join("&");
      const result = await apiRequest<{ report: AdminReport }>(`/admin/reports${params ? `?${params}` : ""}`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setReport(result.report);
    } catch (error) {
      Alert.alert("Reports", error instanceof Error ? error.message : "Could not load report");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) {
      Alert.alert("Password", "Enter both current password and new password.");
      return;
    }
    const passwordError = validateStrongPassword(newPassword);
    if (passwordError) {
      Alert.alert("Password", passwordError);
      return;
    }

    try {
      setLoading(true);
      await apiRequest<{ ok: boolean }>("/auth/change-password", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setCurrentPassword("");
      setNewPassword("");
      Alert.alert("Password changed", "Use the new password next time you login.");
    } catch (error) {
      Alert.alert("Password", error instanceof Error ? error.message : "Could not change password");
    } finally {
      setLoading(false);
    }
  }

  function requestPasswordChange() {
    confirmAction("Change password", "After this, use the new password for future logins.", changePassword);
  }

  async function changeLoginId() {
    if (!loginIdPassword || !newLoginId.trim()) {
      Alert.alert("Login ID", "Enter current password and the new login phone number.");
      return;
    }

    try {
      setLoading(true);
      const result = await apiRequest<{ ok: boolean; user: User }>("/auth/change-login-id", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ currentPassword: loginIdPassword, newPhone: newLoginId })
      });
      const updatedSession = { ...session, user: { ...session.user, phone: result.user.phone } };
      onSessionUpdate?.(updatedSession);
      setLoginIdPassword("");
      setNewLoginId(result.user.phone);
      Alert.alert("Login ID changed", "Use the new phone number the next time you login.");
    } catch (error) {
      Alert.alert("Login ID", error instanceof Error ? error.message : "Could not change login ID");
    } finally {
      setLoading(false);
    }
  }

  function requestLoginIdChange() {
    confirmAction("Change admin login ID", "After this, use the new phone number for future admin logins.", changeLoginId);
  }

  async function approveApplication(applicationId: string) {
    const passwordError = validateStrongPassword(applicationPassword);
    if (passwordError) {
      Alert.alert("Application approval", passwordError);
      return;
    }

    try {
      setLoading(true);
      const result = await apiRequest<{ credentials: { phone: string; password: string; emailSent?: boolean; emailReason?: string } }>(`/admin/applications/${applicationId}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          password: applicationPassword,
          sponsorId: applicationSponsorId || undefined
        })
      });
      setApplicationSponsorId("");
      await loadAdminPanel();
      Alert.alert(
        "Application approved",
        [
          `Login phone: ${result.credentials.phone}`,
          `Password: ${result.credentials.password}`,
          `Email: ${result.credentials.emailSent ? "Sent" : "Not sent"}`,
          result.credentials.emailSent ? "" : `Reason: ${result.credentials.emailReason ?? "Unknown email error"}`
        ].filter(Boolean).join("\n")
      );
    } catch (error) {
      Alert.alert("Application approval", error instanceof Error ? error.message : "Could not approve application");
    } finally {
      setLoading(false);
    }
  }

  function requestApproveApplication(applicationId: string) {
    confirmAction("Approve application", "This will create the user login with the password shown here.", () => approveApplication(applicationId));
  }

  async function rejectApplication(applicationId: string) {
    try {
      setLoading(true);
      await apiRequest<{ application: MemberApplication }>(`/admin/applications/${applicationId}/reject`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ reason: applicationRejectReason || "Rejected by admin" })
      });
      setApplicationRejectReason("");
      await loadAdminPanel();
    } catch (error) {
      Alert.alert("Application rejection", error instanceof Error ? error.message : "Could not reject application");
    } finally {
      setLoading(false);
    }
  }

  async function resetTestData() {
    try {
      setLoading(true);
      const result = await apiRequest<{ ok: boolean; message: string }>("/admin/system/reset-test-data", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` }
      });
      await loadAdminPanel();
      Alert.alert("Database Reset", result.message);
    } catch (error) {
      Alert.alert("Database Reset", error instanceof Error ? error.message : "Could not reset test data");
    } finally {
      setLoading(false);
    }
  }

  function requestTestDataReset() {
    confirmAction(
      "Reset Test Database?",
      "WARNING: This will permanently delete ALL test users, network structures, orders, payments, applications, and commissions from the live database. Core products and help topics will be kept. Continue?",
      resetTestData
    );
  }

  // Handle CSV exports dynamically and share file
  async function handleExportCsv(type: "orders" | "payments" | "commissions") {
    try {
      setExporting(true);
      const params = [
        reportFrom ? `from=${encodeURIComponent(reportFrom)}` : "",
        reportTo ? `to=${encodeURIComponent(reportTo)}` : ""
      ].filter(Boolean).join("&");

      const response = await fetch(`${API_URL}/admin/reports/${type}/export${params ? `?${params}` : ""}`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }
      const csvText = await response.text();

      const file = new File(Paths.document, `${type}_export_${Date.now()}.csv`);
      await file.write(csvText);
      const fileUri = file.uri;

      await Share.share({
        url: fileUri,
        title: `Export ${type.toUpperCase()}`,
        message: `Kerala Ayurvedh MLM - Exported ${type} spreadsheet file.`
      });
    } catch (error) {
      Alert.alert("CSV Export", error instanceof Error ? error.message : "Could not export spreadsheet");
    } finally {
      setExporting(false);
    }
  }

  function getSponsorOptionsLocal(role: Role, usersList: User[]) {
    if (role === "BETA_MANAGER") {
      return usersList.filter((user) => user.role === "MANAGER" && user.betaManagerEligibility?.canCreateBetaManager);
    }
    if (role === "LEVEL_1") {
      return usersList.filter((user) => user.role === "MANAGER" || user.role === "BETA_MANAGER");
    }
    if (role === "LEVEL_2") {
      return usersList.filter((user) => user.role === "LEVEL_1");
    }
    if (role === "CUSTOMER") {
      return usersList.filter((user) => user.role === "LEVEL_2");
    }
    return [];
  }

  useEffect(() => {
    loadAdminPanel();
  }, []);

  if (session.user.role !== "ADMIN") {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyState title="Admin only" text="This panel is available only for Company Admin." />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="Company Admin" action="Refresh" onAction={loadAdminPanel} />
      {loading && <ActivityIndicator color={colors.brand600} />}
      <AdminSectionTabs active={adminSection} onChange={setAdminSection} />
      
      {adminSection === "overview" && stats ? (
        <>
          <View style={styles.adminGrid}>
            <MetricCard label="Users" value={String(stats.totalUsers)} />
            <MetricCard label="Products" value={String(stats.totalProducts)} />
            <MetricCard label="Applications" value={String(stats.pendingApplications)} />
            <MetricCard label="User payments" value={String(stats.pendingUserPayments)} />
            <MetricCard label="Order payments" value={String(stats.pendingOrderPayments)} />
          </View>
          <View style={styles.adminGrid}>
            <MetricCard label="Active products" value={String(stats.activeProducts)} />
            <MetricCard label="Coming soon" value={String(stats.comingSoonProducts)} />
            <MetricCard label="Out of stock" value={String(stats.outOfStockProducts)} />
            <MetricCard label="Low stock" value={String(stats.lowStockCount ?? 0)} />
            <MetricCard label="Matrices" value={String(stats.matrices.length)} />
          </View>
          {stats.lowStockProducts && stats.lowStockProducts.length > 0 ? (
            <View style={styles.reportBlock}>
              <Text style={styles.cardTitle}>Low-stock alerts</Text>
              {stats.lowStockProducts.map((product) => (
                <SystemInfoRow key={product.id} label={product.name} value={`${product.stock ?? 0} left`} />
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      {adminSection === "overview" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Product stock rule</Text>
          <Text style={styles.mutedText}>
            Admin can see exact stock in Products. Other users only see Available, Out of Stock, or Coming Soon.
          </Text>
        </View>
      ) : null}

      {adminSection === "overview" ? (
        <View style={[styles.card, { borderLeftColor: colors.danger, borderLeftWidth: 4 }]}>
          <Text style={styles.cardTitle}>Developer Database Tools</Text>
          <Text style={styles.mutedText}>
            Use this button to completely wipe all test users, network structures, orders, commissions, applications, and logs from the database, returning the system to a clean state.
          </Text>
          <View style={{ marginTop: 12 }}>
            <PrimaryButton 
              label="Reset Test Database" 
              onPress={requestTestDataReset} 
              loading={loading}
            />
          </View>
        </View>
      ) : null}

      {adminSection === "applications" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Member applications</Text>
          <Text style={styles.inputLabel}>Application status filter</Text>
          <OptionList
            items={["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((status) => ({ id: status }))}
            selectedId={applicationFilter}
            emptyText="No statuses."
            onSelect={(value) => setApplicationFilter(value as "ALL" | MemberApplication["status"])}
            renderLabel={(item) => item.id}
          />
          <Input label="Approval password" value={applicationPassword} onChangeText={setApplicationPassword} secureTextEntry />
          <Input label="Reject reason" value={applicationRejectReason} onChangeText={setApplicationRejectReason} />
          {filteredApplications.length === 0 ? (
            <Text style={styles.mutedText}>No applications submitted yet.</Text>
          ) : (
            filteredApplications.map((application) => {
              const sponsorOptions = application.requestedRole === "MANAGER" ? [] : getSponsorOptionsLocal(application.requestedRole, users);
              return (
                <View key={application.id} style={styles.adminListBlock}>
                  <Text style={styles.listTitle}>{application.name}</Text>
                  <Text style={styles.listSubtitle}>
                    {formatRole(application.requestedRole)} - {application.phone} - {application.status}
                  </Text>
                  <Text style={styles.detailLine}>Email: {application.email ?? "Not given"}</Text>
                  <Text style={styles.detailLine}>Sponsor phone: {application.sponsorPhone ?? "Not needed"}</Text>
                  <Text style={styles.detailLine}>Aadhaar: {application.aadhaarNumber ?? "Not given"}</Text>
                  <Text style={styles.detailLine}>PAN: {application.panNumber ?? "Not given"}</Text>
                  {application.status === "PENDING" ? (
                    <>
                      {application.requestedRole !== "MANAGER" ? (
                        <>
                          <Text style={styles.inputLabel}>Sponsor for approval</Text>
                          <OptionList
                            items={sponsorOptions}
                            selectedId={applicationSponsorId}
                            emptyText="No valid sponsor loaded for this role."
                            onSelect={setApplicationSponsorId}
                            renderLabel={(user) => `${user.name} - ${formatRole(user.role)} - ${user.phone}`}
                          />
                        </>
                      ) : null}
                      <View style={styles.statusActions}>
                        <Pressable style={styles.adminActionButton} onPress={() => requestApproveApplication(application.id)}>
                          <Text style={styles.adminActionText}>Approve and create login</Text>
                        </Pressable>
                        <Pressable style={styles.adminDangerButton} onPress={() => rejectApplication(application.id)}>
                          <Text style={styles.adminDangerText}>Reject</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.mutedText}>
                      {application.approvedUser ? `Created user: ${application.approvedUser.name}` : application.rejectionReason ?? "Decision completed"}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      ) : null}

      {adminSection === "users" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Users</Text>
          <Input label="Search user" value={userSearch} onChangeText={setUserSearch} />
          <Text style={styles.inputLabel}>Role filter</Text>
          <OptionList
            items={["ALL", "ADMIN", "MANAGER", "BETA_MANAGER", "LEVEL_1", "LEVEL_2", "CUSTOMER"].map((role) => ({ id: role }))}
            selectedId={roleFilter}
            emptyText="No roles."
            onSelect={(value) => setRoleFilter(value as Role | "ALL")}
            renderLabel={(item) => item.id === "ALL" ? "All" : formatRole(item.id)}
          />
          <Text style={styles.inputLabel}>Status filter</Text>
          <OptionList
            items={["ALL", ...userStatusOptions].map((status) => ({ id: status }))}
            selectedId={statusFilter}
            emptyText="No statuses."
            onSelect={(value) => setStatusFilter(value as UserStatus | "ALL")}
            renderLabel={(item) => item.id}
          />
          {selectedUser ? (
            <AdminUserDetailCard
              user={selectedUser}
              onClose={() => setSelectedUser(null)}
              onStatusChange={(status) => requestUserStatusUpdate(selectedUser.id, status)}
              resetPassword={selectedUserNewPassword}
              onResetPasswordChange={setSelectedUserNewPassword}
              onResetPassword={() => requestSelectedUserPasswordReset(selectedUser.id)}
              onConfirmPayment={() => requestSelectedUserPaymentConfirmation(selectedUser.id)}
              onToggleProfileAccess={toggleProfileAccess}
            />
          ) : null}
          {users.length === 0 ? (
            <Text style={styles.mutedText}>No users loaded yet.</Text>
          ) : (
            filteredUsers.map((user) => (
              <View key={user.id} style={styles.adminListBlock}>
                <Text style={styles.listTitle}>{user.name}</Text>
                <Text style={styles.listSubtitle}>{formatRole(user.role)} - {user.phone} - {user.status}</Text>
                <Pressable style={styles.adminActionButton} onPress={() => loadUserDetail(user.id)}>
                  <Text style={styles.adminActionText}>View details</Text>
                </Pressable>
                {user.role !== "ADMIN" ? (
                  <View style={styles.statusActions}>
                    {userStatusOptions.map((status) => (
                      <Pressable
                        key={status}
                        style={[styles.statusButton, user.status === status && styles.statusButtonActive]}
                        onPress={() => requestUserStatusUpdate(user.id, status)}
                      >
                        <Text style={[styles.statusButtonText, user.status === status && styles.statusButtonTextActive]}>{status}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      ) : null}

      {adminSection === "orders" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order management</Text>
          <Text style={styles.inputLabel}>Order</Text>
          <OptionList
            items={orders}
            selectedId={selectedOrderId}
            emptyText="No orders loaded."
            onSelect={setSelectedOrderId}
            renderLabel={(order) => `${order.customer?.name ?? "Customer"} - ${formatMoney(order.totalAmount)} - ${order.status}`}
          />
          <Text style={styles.inputLabel}>Order status</Text>
          <OptionList
            items={orderStatusOptions.map((status) => ({ id: status }))}
            selectedId={selectedOrderStatus}
            emptyText="No order statuses."
            onSelect={(value) => setSelectedOrderStatus(value as OrderStatus)}
            renderLabel={(item) => item.id.replaceAll("_", " ")}
          />
          <Text style={styles.inputLabel}>Payment status</Text>
          <OptionList
            items={paymentStatusOptions.map((status) => ({ id: status }))}
            selectedId={selectedPaymentStatus}
            emptyText="No payment statuses."
            onSelect={(value) => setSelectedPaymentStatus(value as PaymentStatus)}
            renderLabel={(item) => item.id.replaceAll("_", " ")}
          />
          <PrimaryButton label="Update order status" onPress={requestUpdateOrderStatus} loading={loading} />
          <View style={styles.spacer} />
          <Text style={styles.inputLabel}>Payment filter</Text>
          <OptionList
            items={["ALL", ...paymentStatusOptions].map((status) => ({ id: status }))}
            selectedId={orderFilter}
            emptyText="No filters."
            onSelect={(value) => setOrderFilter(value as PaymentStatus | "ALL")}
            renderLabel={(item) => item.id.replaceAll("_", " ")}
          />
          {selectedOrderDetail ? <OrderDetailCard order={selectedOrderDetail} onClose={() => setSelectedOrderDetail(null)} /> : null}
          {filteredOrders.length === 0 ? (
            <Text style={styles.mutedText}>No orders match this filter.</Text>
          ) : (
            filteredOrders.map((order) => (
              <View key={order.id} style={styles.adminListBlock}>
                <Text style={styles.listTitle}>{order.customer?.name ?? "Customer"}</Text>
                <Text style={styles.listSubtitle}>{formatMoney(order.totalAmount)} - {order.status} - {order.paymentStatus}</Text>
                <Pressable style={styles.adminActionButton} onPress={() => setSelectedOrderDetail(order)}>
                  <Text style={styles.adminActionText}>View order</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      ) : null}

      {adminSection === "commissions" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Commission reporting</Text>
          <Input label="Search receiver/source" value={commissionSearch} onChangeText={setCommissionSearch} />
          <Text style={styles.inputLabel}>Commission status filter</Text>
          <OptionList
            items={["ALL", ...commissionStatusOptions].map((status) => ({ id: status }))}
            selectedId={commissionFilter}
            emptyText="No commission statuses."
            onSelect={(value) => setCommissionFilter(value as CommissionStatusValue | "ALL")}
            renderLabel={(item) => item.id}
          />
          <Text style={styles.inputLabel}>Manual commission receiver</Text>
          <OptionList
            items={users.filter((user) => user.role !== "ADMIN")}
            selectedId={manualReceiverId}
            emptyText="No users loaded."
            onSelect={setManualReceiverId}
            renderLabel={(user) => `${user.name} - ${formatRole(user.role)}`}
          />
          <Input label="Manual amount" value={manualAmount} onChangeText={setManualAmount} keyboardType="numeric" />
          <Input label="Notes" value={manualNotes} onChangeText={setManualNotes} />
          <PrimaryButton label="Add manual commission" onPress={requestCreateManualCommission} loading={loading} />
          <View style={styles.spacer} />
          <MetricCard label="Filtered commission total" value={formatMoney(filteredCommissions.reduce((sum, commission) => sum + Number(commission.amount), 0))} full />
          {filteredCommissions.length === 0 ? (
            <Text style={styles.mutedText}>No commissions match this filter.</Text>
          ) : (
            filteredCommissions.map((commission) => (
              <View key={commission.id} style={styles.adminListBlock}>
                <Text style={styles.listTitle}>{formatMoney(commission.amount)}</Text>
                <Text style={styles.listSubtitle}>
                  {commission.receiver?.name ?? "Receiver"} - {commission.type.replaceAll("_", " ")}
                </Text>
                <Pressable style={styles.adminActionButton} onPress={() => requestMarkCommissionPaid(commission.id)}>
                  <Text style={styles.adminActionText}>Mark paid</Text>
                </Pressable>
                <View style={styles.statusActions}>
                  {commissionStatusOptions.map((status) => (
                    <Pressable key={status} style={styles.statusButton} onPress={() => requestCommissionStatusUpdate(commission.id, status)}>
                      <Text style={styles.statusButtonText}>{status}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      ) : null}

      {adminSection === "reports" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Admin reports & Exports</Text>
          <Input label="From date (YYYY-MM-DD)" value={reportFrom} onChangeText={setReportFrom} />
          <Input label="To date (YYYY-MM-DD)" value={reportTo} onChangeText={setReportTo} />
          <PrimaryButton label="Load report" onPress={loadReport} loading={loading} />

          {/* CSV Export Triggers */}
          <Text style={styles.exportSectionHeader}>Export Spreadsheets (CSV)</Text>
          <View style={styles.exportButtonGroup}>
            <Pressable style={styles.exportButton} onPress={() => handleExportCsv("orders")}>
              <Text style={styles.exportButtonText}>Export Orders</Text>
            </Pressable>
            <Pressable style={styles.exportButton} onPress={() => handleExportCsv("payments")}>
              <Text style={styles.exportButtonText}>Export Payments</Text>
            </Pressable>
            <Pressable style={styles.exportButton} onPress={() => handleExportCsv("commissions")}>
              <Text style={styles.exportButtonText}>Export Earnings</Text>
            </Pressable>
          </View>
          {exporting && <ActivityIndicator color={colors.brand700} style={styles.exportLoader} />}

          {!report ? (
            <Text style={styles.mutedText}>Tap Load report to view totals.</Text>
          ) : (
            <>
              <View style={styles.adminGrid}>
                <MetricCard label="Total stock" value={String(report.stock.totalStock)} />
                <MetricCard label="Low stock" value={String(report.stock.lowStockCount)} />
              </View>

              <ReportBlock title="Users by role" rows={report.users.byRole} />
              <ReportBlock title="Users by status" rows={report.users.byStatus} />
              <ReportBlock title="Orders by status" rows={report.orders.byStatus} />
              <ReportBlock title="Orders by payment" rows={report.orders.byPaymentStatus} />
              <ReportBlock title="Commissions by status" rows={report.commissions.byStatus} />
              <ReportBlock title="Commissions by type" rows={report.commissions.byType} />
              <ReportBlock title="Payment handovers" rows={report.payments.handoversByStatus} />

              <Text style={styles.detailSectionTitle}>Low stock products</Text>
              {report.stock.lowStockProducts.length === 0 ? (
                <Text style={styles.mutedText}>No low stock products.</Text>
              ) : (
                report.stock.lowStockProducts.map((product) => (
                  <ListItem
                    key={product.id}
                    title={product.name}
                    subtitle={`${product.category} - ${product.availability}`}
                    right={`Stock ${product.stock ?? 0}`}
                  />
                ))
              )}

              <Text style={styles.detailSectionTitle}>Export text</Text>
              <Text style={styles.reportText}>{buildReportText(report)}</Text>
            </>
          )}
        </View>
      ) : null}

      {adminSection === "help" ? <HelpManagerSection session={session} /> : null}

      {adminSection === "system" ? (
        <SystemMonitorSection
          session={session}
          databaseStats={databaseStats}
          storageStats={storageStats}
          systemHealth={systemHealth}
          backupStatus={backupStatus}
          error={systemError}
          lastUpdated={systemUpdatedAt}
          tableSearch={systemTableSearch}
          filteredTables={filteredSystemTables}
          onTableSearch={setSystemTableSearch}
          onRefresh={() => loadSystemMonitor(true)}
        />
      ) : null}

      {adminSection === "users" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Role upgrades</Text>
          <Text style={styles.inputLabel}>User</Text>
          <OptionList
            items={users.filter((user) => user.role !== "ADMIN")}
            selectedId={upgradeUserId}
            emptyText="No users loaded."
            onSelect={setUpgradeUserId}
            renderLabel={(user) => `${user.name} - ${formatRole(user.role)}`}
          />
          <Text style={styles.inputLabel}>New role</Text>
          <OptionList
            items={["MANAGER", "LEVEL_1", "LEVEL_2", "CUSTOMER"].map((role) => ({ id: role }))}
            selectedId={upgradeRole}
            emptyText="No roles."
            onSelect={(value) => setUpgradeRole(value as Role)}
            renderLabel={(item) => formatRole(item.id)}
          />
          {upgradeRole !== "MANAGER" ? (
            <>
              <Text style={styles.inputLabel}>Target sponsor</Text>
              <OptionList
                items={users.filter((user) => user.role !== "ADMIN" && user.id !== upgradeUserId)}
                selectedId={upgradeSponsorId}
                emptyText="No sponsors loaded."
                onSelect={setUpgradeSponsorId}
                renderLabel={(user) => `${user.name} - ${formatRole(user.role)}`}
              />
            </>
          ) : null}
          <PrimaryButton label="Create upgrade request" onPress={createUpgradeRequest} loading={loading} />
          <View style={styles.spacer} />
          {upgradeRequests.map((request) => (
            <View key={request.id} style={styles.adminListBlock}>
              <Text style={styles.listTitle}>{request.requester?.name ?? "User"} to {formatRole(request.toRole)}</Text>
              <Text style={styles.listSubtitle}>Status: {request.status}</Text>
              {request.reason ? (
                <Text style={styles.detailLine}>Message: "{request.reason}"</Text>
              ) : null}
              {request.aadhaarNumber ? (
                <Text style={styles.detailLine}>Aadhaar: {request.aadhaarNumber}</Text>
              ) : null}
              {request.panNumber ? (
                <Text style={styles.detailLine}>PAN: {request.panNumber}</Text>
              ) : null}
              {request.status === "PENDING" ? (
                <View style={styles.statusActions}>
                  <Pressable style={styles.adminActionButton} onPress={() => requestUpgradeDecision(request.id, "APPROVED")}>
                    <Text style={styles.adminActionText}>Approve</Text>
                  </Pressable>
                  <Pressable style={styles.adminDangerButton} onPress={() => requestUpgradeDecision(request.id, "REJECTED")}>
                    <Text style={styles.adminDangerText}>Reject</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {adminSection === "users" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sponsor reassignment</Text>
          <Text style={styles.inputLabel}>User to move</Text>
          <OptionList
            items={users.filter((user) => ["LEVEL_1", "LEVEL_2", "CUSTOMER"].includes(user.role))}
            selectedId={reassignUserId}
            emptyText="No movable users loaded."
            onSelect={setReassignUserId}
            renderLabel={(user) => `${user.name} - ${formatRole(user.role)}`}
          />
          <Text style={styles.inputLabel}>New sponsor</Text>
          <OptionList
            items={users.filter((user) => user.role !== "ADMIN" && user.id !== reassignUserId)}
            selectedId={reassignSponsorId}
            emptyText="No sponsors loaded."
            onSelect={setReassignSponsorId}
            renderLabel={(user) => `${user.name} - ${formatRole(user.role)}`}
          />
          <PrimaryButton label="Create reassignment request" onPress={createReassignmentRequest} loading={loading} />
          <View style={styles.spacer} />
          {reassignmentRequests.map((request) => (
            <View key={request.id} style={styles.adminListBlock}>
              <Text style={styles.listTitle}>{request.subjectUser?.name ?? "User"}</Text>
              <Text style={styles.listSubtitle}>Move to sponsor {request.toSponsorId} - {request.status}</Text>
              {request.status === "PENDING" ? (
                <View style={styles.statusActions}>
                  <Pressable style={styles.adminActionButton} onPress={() => requestReassignmentDecision(request.id, "APPROVED")}>
                    <Text style={styles.adminActionText}>Approve</Text>
                  </Pressable>
                  <Pressable style={styles.adminDangerButton} onPress={() => requestReassignmentDecision(request.id, "REJECTED")}>
                    <Text style={styles.adminDangerText}>Reject</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {adminSection === "payments" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment approval queue</Text>
          <Text style={styles.inputLabel}>Handover status filter</Text>
          <OptionList
            items={["ALL", "PENDING", "HANDED_OVER", "RECEIVED", "DISPUTED", "CANCELLED"].map((status) => ({ id: status }))}
            selectedId={handoverFilter}
            emptyText="No handover filters."
            onSelect={setHandoverFilter}
            renderLabel={(item) => item.id.replaceAll("_", " ")}
          />
          {filteredHandovers.length === 0 ? (
            <Text style={styles.mutedText}>No handovers match this filter.</Text>
          ) : (
            filteredHandovers.map((handover) => (
              <View key={handover.id} style={styles.adminListBlock}>
                <Text style={styles.listTitle}>{formatMoney(handover.amount)}</Text>
                <Text style={styles.listSubtitle}>
                  {handover.fromUser?.name ?? "Sender"} to {handover.toUser?.name ?? "Receiver"} - {handover.status}
                </Text>
                {handover.order ? (
                  <Text style={styles.detailLine}>
                    Order: {formatMoney(handover.order.totalAmount)} - {handover.order.status} - {handover.order.paymentStatus}
                  </Text>
                ) : null}
                <Text style={styles.detailLine}>
                  Proof: {handover.proofFile ? `${handover.proofFile.originalName} (${formatBytes(handover.proofFile.sizeBytes)})` : "Not uploaded"}
                </Text>
                <View style={styles.statusActions}>
                  {handover.proofFile ? (
                    <Pressable style={styles.adminActionButton} onPress={() => openPaymentProof(handover.proofFile?.id)}>
                      <Text style={styles.adminActionText}>View proof</Text>
                    </Pressable>
                  ) : null}
                  <Pressable style={styles.adminActionButton} onPress={() => requestPaymentHandoverStatus(handover.id, "RECEIVED")}>
                    <Text style={styles.adminActionText}>Mark received</Text>
                  </Pressable>
                  <Pressable style={styles.adminDangerButton} onPress={() => requestPaymentHandoverStatus(handover.id, "DISPUTED")}>
                    <Text style={styles.adminDangerText}>Dispute</Text>
                  </Pressable>
                  <Pressable style={styles.adminDangerButton} onPress={() => requestPaymentHandoverStatus(handover.id, "CANCELLED")}>
                    <Text style={styles.adminDangerText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      ) : null}

      {adminSection === "security" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Security</Text>
          <Text style={styles.mutedText}>Only Admin can change the admin login ID and password from this section.</Text>
          <Input label="Current password for login ID" value={loginIdPassword} onChangeText={setLoginIdPassword} secureTextEntry />
          <Input label="New admin login phone" value={newLoginId} onChangeText={setNewLoginId} keyboardType="phone-pad" />
          <PrimaryButton label="Change login ID" onPress={requestLoginIdChange} loading={loading} />
          <View style={styles.spacer} />
          <Input label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
          <Input label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
          <PrimaryButton label="Change password" onPress={requestPasswordChange} loading={loading} />
          <Text style={styles.mutedText}>Logout confirmation is enabled from the profile icon. Login persistence and app PIN can be added after Expo storage dependencies are installed.</Text>
        </View>
      ) : null}

      {adminSection === "audit" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Audit logs</Text>
          {selectedAuditLog ? <AuditDetailCard log={selectedAuditLog} onClose={() => setSelectedAuditLog(null)} /> : null}
          {auditLogs.length === 0 ? (
            <Text style={styles.mutedText}>No audit logs yet.</Text>
          ) : (
            auditLogs.slice(0, 30).map((log) => (
              <View key={log.id} style={styles.adminListBlock}>
                <Text style={styles.listTitle}>{log.action.replaceAll("_", " ")}</Text>
                <Text style={styles.listSubtitle}>{log.entityType} - {log.actor?.name ?? "System"}</Text>
                <Pressable style={styles.adminActionButton} onPress={() => setSelectedAuditLog(log)}>
                  <Text style={styles.adminActionText}>View log</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      ) : null}

      {adminSection === "matrix" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Matrix detail</Text>
          {!stats || stats.matrices.length === 0 ? (
            <Text style={styles.mutedText}>No beta matrices yet.</Text>
          ) : (
            stats.matrices.map((matrix) => (
              <View key={matrix.id} style={styles.matrixBox}>
                <Text style={styles.listTitle}>{matrix.betaManager?.name ?? "Beta Manager"}</Text>
                <Text style={styles.listSubtitle}>
                  Root: {matrix.rootManager?.name ?? "Manager"} - {matrix.confirmedCustomers}/{matrix.requiredCustomers}
                </Text>
                <Text style={styles.productPrice}>{matrix.status} - {formatMoney(matrix.completionAmount)}</Text>
                <Pressable style={styles.adminActionButton} onPress={() => setSelectedMatrixId(selectedMatrixId === matrix.id ? "" : matrix.id)}>
                  <Text style={styles.adminActionText}>{selectedMatrixId === matrix.id ? "Hide detail" : "View detail"}</Text>
                </Pressable>
                {selectedMatrixId === matrix.id ? <MatrixDetailCard matrix={matrix} /> : null}
              </View>
            ))
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

function SystemMonitorSection({
  session,
  databaseStats,
  storageStats,
  systemHealth,
  backupStatus,
  error,
  lastUpdated,
  tableSearch,
  filteredTables,
  onTableSearch,
  onRefresh
}: {
  session: Session;
  databaseStats: DatabaseStats | null;
  storageStats: UploadStorageStats | null;
  systemHealth: SystemHealth | null;
  backupStatus: BackupStatus | null;
  error: string;
  lastUpdated: string;
  tableSearch: string;
  filteredTables: DatabaseTableStat[];
  onTableSearch: (value: string) => void;
  onRefresh: () => void;
}) {
  const database = databaseStats?.database;
  const activity = databaseStats?.activity ?? {};
  const counts = databaseStats?.businessCounts ?? {};
  const warnings = [...(databaseStats?.warnings ?? []), ...(storageStats?.warnings ?? []), ...(backupStatus?.warnings ?? [])];
  const storagePercent = database?.usedPercent ?? 0;

  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateMessage, setUpdateMessage] = useState(
    "A new version of Kerala Ayurvedh is available. Please download and install the fresh update to continue."
  );
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const result = await apiRequest<{ updateAvailable: boolean; updateMessage: string }>("/auth/app-update-status");
        setUpdateAvailable(result.updateAvailable);
        setUpdateMessage(result.updateMessage);
      } catch {
        // Silent error
      }
    }
    loadSettings();
  }, []);

  async function handleSaveSettings() {
    try {
      setSavingSettings(true);
      await apiRequest("/admin/app-update-status", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          updateAvailable,
          updateMessage
        })
      });
      Alert.alert("Success", "System update settings saved successfully.");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <View style={styles.systemStack}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>App Update Prompter Settings</Text>
        <Text style={styles.mutedText}>
          Toggling this option will display a persistent, non-dismissible popup to every mobile user stating that a new update is available.
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 14, padding: 12, backgroundColor: colors.slate50, borderRadius: 8, borderWidth: 1, borderColor: colors.slate200 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.slate900 }}>Update Prompter Toggle</Text>
          <Pressable
            style={{
              width: 52,
              height: 28,
              borderRadius: 14,
              backgroundColor: updateAvailable ? colors.brand600 : colors.slate200,
              padding: 2,
              justifyContent: "center",
            }}
            onPress={() => setUpdateAvailable(!updateAvailable)}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: colors.white,
                alignSelf: updateAvailable ? "flex-end" : "flex-start",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
                elevation: 2
              }}
            />
          </Pressable>
        </View>

        <TextArea
          label="Custom Update Notification Message"
          value={updateMessage}
          onChangeText={setUpdateMessage}
        />

        <PrimaryButton
          label="Save Update Configuration"
          onPress={handleSaveSettings}
          loading={savingSettings}
        />
      </View>
      <View style={styles.systemHeroCard}>
        <View style={styles.systemHeroTop}>
          <View style={styles.systemHeroIcon}>
            <Text style={styles.systemHeroIconText}>DB</Text>
          </View>
          <View style={styles.systemHeroCopy}>
            <Text style={styles.systemHeroTitle}>Database & System</Text>
            <Text style={styles.systemHeroText}>Read-only operational monitor for Company Admin.</Text>
          </View>
          <Pressable style={styles.adminActionButton} onPress={onRefresh}>
            <Text style={styles.adminActionText}>Refresh</Text>
          </Pressable>
        </View>
        <Text style={styles.systemHeroText}>Last updated: {formatDateTime(lastUpdated)}</Text>
        {error ? <Text style={styles.systemErrorText}>{error}</Text> : null}
      </View>

      <View style={styles.adminGrid}>
        <MetricCard label="Database Used" value={database?.sizePretty ?? "Loading"} />
        <MetricCard label="Storage Limit" value={database?.storageLimitMb ? `${database.storageLimitMb} MB` : "Not set"} />
        <MetricCard label="Used %" value={database?.usedPercent !== null && database?.usedPercent !== undefined ? `${database.usedPercent}%` : "N/A"} />
        <MetricCard label="Active DB Conns" value={String(database?.activeConnections ?? 0)} />
        <MetricCard label="Total Users" value={String(activity.totalUsers ?? 0)} />
        <MetricCard label="Total Orders" value={String(activity.totalOrders ?? 0)} />
        <MetricCard label="Pending Apps" value={String(activity.pendingApplications ?? 0)} />
        <MetricCard label="Pending Payments" value={String(activity.pendingPaymentHandovers ?? 0)} />
      </View>

      <View style={styles.card}>
        <View style={styles.systemSectionHeader}>
          <Text style={styles.cardTitle}>Database Storage</Text>
          <SystemStatusBadge status={database?.status ?? "loading"} />
        </View>
        <SystemInfoRow label="Database name" value={database?.name ?? "Loading"} />
        <SystemInfoRow label="Database size" value={database?.sizePretty ?? "Loading"} />
        <SystemInfoRow label="Storage limit" value={database?.storageLimitMb ? `${database.storageLimitMb} MB` : "Not configured"} />
        <SystemInfoRow label="PostgreSQL" value={database?.postgresVersion ? database.postgresVersion.split(" ").slice(0, 2).join(" ") : "Loading"} />
        <SystemInfoRow label="Server uptime" value={database?.serverUptime ?? "Not available"} />
        <View style={styles.systemProgressTrack}>
          <View
            style={[
              styles.systemProgressFill,
              { width: `${Math.max(2, Math.min(100, storagePercent))}%` },
              database?.status === "critical" && styles.systemProgressCritical,
              database?.status === "warning" && styles.systemProgressWarning
            ]}
          />
        </View>
        <Text style={styles.mutedText}>
          {database?.usedPercent !== null && database?.usedPercent !== undefined
            ? `${database.usedPercent}% of configured database storage is used.`
            : "Set DATABASE_STORAGE_LIMIT_MB on backend to calculate usage percentage."}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Table Usage</Text>
        <Input label="Search table" value={tableSearch} onChangeText={onTableSearch} />
        {filteredTables.length === 0 ? (
          <Text style={styles.mutedText}>No table usage data loaded yet.</Text>
        ) : (
          filteredTables.map((table) => (
            <View key={table.tableName} style={styles.systemTableRow}>
              <View style={styles.systemTableTop}>
                <Text style={styles.listTitle}>{table.tableName}</Text>
                <Text style={styles.productPrice}>{table.totalSizePretty}</Text>
              </View>
              <Text style={styles.listSubtitle}>
                Rows {table.estimatedRows.toLocaleString("en-IN")} - Index {table.indexSizePretty} - Dead {table.deadRows.toLocaleString("en-IN")}
              </Text>
              <Text style={styles.detailLine}>Data: {table.tableSizePretty} | Toast: {table.toastSizePretty ?? "0 bytes"}</Text>
              <Text style={styles.detailLine}>
                Vacuum: {formatDateTime(table.lastVacuum ?? table.lastAutovacuum)} | Analyze: {formatDateTime(table.lastAnalyze ?? table.lastAutoanalyze)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Business Counts</Text>
        <View style={styles.systemCountGrid}>
          <SystemMiniStat label="Users" value={counts.users} />
          <SystemMiniStat label="Products" value={counts.products} />
          <SystemMiniStat label="Orders" value={counts.orders} />
          <SystemMiniStat label="Order items" value={counts.orderItems} />
          <SystemMiniStat label="Payments" value={counts.paymentHandovers} />
          <SystemMiniStat label="Commissions" value={counts.commissions} />
          <SystemMiniStat label="Applications" value={counts.memberApplications} />
          <SystemMiniStat label="Audit logs" value={counts.auditLogs} />
          <SystemMiniStat label="Stock adjustments" value={counts.stockAdjustments} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Activity</Text>
        <SystemInfoRow label="Active users" value={String(activity.activeUsers ?? 0)} />
        <SystemInfoRow label="Suspended users" value={String(activity.suspendedUsers ?? 0)} />
        <SystemInfoRow label="Terminated users" value={String(activity.terminatedUsers ?? 0)} />
        <SystemInfoRow label="Orders today" value={String(activity.ordersToday ?? 0)} />
        <SystemInfoRow label="Orders this month" value={String(activity.ordersThisMonth ?? 0)} />
        <SystemInfoRow label="Pending commissions" value={String(activity.pendingCommissions ?? 0)} />
        <SystemInfoRow label="Paid commissions" value={String(activity.paidCommissions ?? 0)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Server Health</Text>
        <SystemInfoRow label="API" value={systemHealth?.health.apiStatus ?? "Loading"} />
        <SystemInfoRow label="Database" value={systemHealth?.health.databaseStatus ?? "Loading"} />
        <SystemInfoRow label="Prisma" value={systemHealth?.health.prismaStatus ?? "Loading"} />
        <SystemInfoRow label="Environment" value={systemHealth?.health.environment ?? "Loading"} />
        <SystemInfoRow label="Uptime" value={systemHealth?.health.uptimePretty ?? "Loading"} />
        <SystemInfoRow label="Memory" value={systemHealth ? `${formatBytes(systemHealth.health.memory.heapUsed)} / ${formatBytes(systemHealth.health.memory.heapTotal)}` : "Loading"} />
        <SystemInfoRow label="Node.js" value={systemHealth?.health.nodeVersion ?? "Loading"} />
        <SystemInfoRow label="Checked" value={formatDateTime(systemHealth?.health.serverTime)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upload Storage</Text>
        <SystemInfoRow label="Provider" value={storageStats?.storage.storageProvider ?? "Loading"} />
        <SystemInfoRow label="Storage used" value={storageStats?.storage.totalPretty ?? "Loading"} />
        <SystemInfoRow label="Local files" value={String(storageStats?.storage.fileCount ?? 0)} />
        <SystemInfoRow label="Tracked files" value={String(storageStats?.storage.fileAssetCount ?? 0)} />
        <SystemInfoRow label="Private files" value={String(storageStats?.storage.sensitiveFileCount ?? 0)} />
        <SystemInfoRow label="Product images" value={String(storageStats?.storage.productUploads ?? 0)} />
        <SystemInfoRow label="Application files" value={String(storageStats?.storage.applicationUploads ?? 0)} />
        <SystemInfoRow label="Payment proof files" value={String(storageStats?.storage.paymentProofUploads ?? 0)} />
        <Text style={styles.detailSectionTitle}>Largest files</Text>
        {(storageStats?.storage.largestFiles ?? []).length === 0 ? (
          <Text style={styles.mutedText}>No local uploads found.</Text>
        ) : (
          storageStats!.storage.largestFiles.map((file) => (
            <View key={`${file.category}-${file.relativeName}`} style={styles.systemFileRow}>
              <Text style={styles.listTitle}>{file.category.replaceAll("_", " ")}</Text>
              <Text style={styles.listSubtitle}>{file.relativeName}</Text>
              <Text style={styles.detailLine}>{formatBytes(file.sizeBytes)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.systemSectionHeader}>
          <Text style={styles.cardTitle}>Backup Monitor</Text>
          <SystemStatusBadge status={backupStatus?.backup.status ?? "loading"} />
        </View>
        <SystemInfoRow label="Directory" value={backupStatus?.backup.directory ?? "Loading"} />
        <SystemInfoRow label="Backup files" value={String(backupStatus?.backup.fileCount ?? 0)} />
        <SystemInfoRow label="Latest backup" value={backupStatus?.backup.latestBackup?.fileName ?? "Not found"} />
        <SystemInfoRow label="Latest age" value={backupStatus?.backup.latestAgeHours !== null && backupStatus?.backup.latestAgeHours !== undefined ? `${backupStatus.backup.latestAgeHours} hours` : "N/A"} />
        <SystemInfoRow label="Max allowed age" value={`${backupStatus?.backup.maxAgeHours ?? 30} hours`} />
        <Text style={styles.detailSectionTitle}>Recent backups</Text>
        {(backupStatus?.backup.recentFiles ?? []).length === 0 ? (
          <Text style={styles.mutedText}>No backup files found yet.</Text>
        ) : (
          backupStatus!.backup.recentFiles.map((file) => (
            <View key={file.fileName} style={styles.systemFileRow}>
              <Text style={styles.listTitle}>{file.fileName}</Text>
              <Text style={styles.listSubtitle}>Modified {formatDateTime(file.modifiedAt)}</Text>
              <Text style={styles.detailLine}>{formatBytes(file.sizeBytes)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Admin Warnings</Text>
        {warnings.length === 0 ? (
          <Text style={styles.mutedText}>No system warnings right now.</Text>
        ) : (
          warnings.map((warning) => (
            <View key={warning} style={styles.systemWarningCard}>
              <Text style={styles.systemWarningText}>{warning}</Text>
            </View>
          ))
        )}
        <Text style={styles.detailSectionTitle}>Maintenance Checklist</Text>
        <SystemInfoRow label="Backup monitoring" value={(backupStatus?.backup.status ?? "loading").replaceAll("_", " ")} />
        <SystemInfoRow label="Storage status" value={(database?.status ?? "loading").replaceAll("_", " ")} />
        <SystemInfoRow label="Pending approvals" value={String(activity.pendingApplications ?? 0)} />
        <SystemInfoRow label="Pending payments" value={String(activity.pendingPaymentHandovers ?? 0)} />
        <SystemInfoRow label="Pending commissions" value={String(activity.pendingCommissions ?? 0)} />
      </View>
    </View>
  );
}

function HelpManagerSection({ session }: { session: Session }) {
  const [topics, setTopics] = useState<BackendHelpTopic[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<HelpTopicRole | "ALL_ROLES">("ALL_ROLES");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyHelpForm());
  const [loading, setLoading] = useState(false);

  const filteredTopics = useMemo(() => {
    const term = search.trim().toLowerCase();
    return topics.filter((topic) => {
      const textMatches = !term || `${topic.title} ${topic.shortDescription} ${topic.content}`.toLowerCase().includes(term);
      const roleMatches = roleFilter === "ALL_ROLES" || topic.role === roleFilter;
      const activeMatches = activeFilter === "ALL" || (activeFilter === "ACTIVE" ? topic.isActive : !topic.isActive);
      return textMatches && roleMatches && activeMatches;
    });
  }, [activeFilter, roleFilter, search, topics]);

  async function loadHelpTopics() {
    try {
      setLoading(true);
      const result = await apiRequest<{ topics: BackendHelpTopic[] }>("/admin/help-topics", {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setTopics(result.topics);
    } catch (error) {
      Alert.alert("Help Manager", error instanceof Error ? error.message : "Could not load help topics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHelpTopics();
  }, []);

  function startEdit(topic: BackendHelpTopic) {
    setEditingId(topic.id);
    setForm({
      title: topic.title,
      shortDescription: topic.shortDescription,
      content: topic.content,
      role: topic.role,
      category: topic.category,
      stepsText: parseHelpSteps(topic.steps).join("\n"),
      relatedRoute: topic.relatedRoute ?? "",
      videoUrl: topic.videoUrl ?? "",
      isActive: topic.isActive,
      sortOrder: String(topic.sortOrder)
    });
  }

  function resetForm() {
    setEditingId("");
    setForm(emptyHelpForm());
  }

  async function saveTopic() {
    try {
      setLoading(true);
      const body = {
        title: form.title,
        shortDescription: form.shortDescription,
        content: form.content,
        role: form.role,
        category: form.category,
        steps: form.stepsText.split("\n").map((item) => item.trim()).filter(Boolean),
        relatedRoute: form.relatedRoute || null,
        videoUrl: form.videoUrl || null,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder || 0)
      };
      await apiRequest<{ topic: BackendHelpTopic }>(editingId ? `/admin/help-topics/${editingId}` : "/admin/help-topics", {
        method: editingId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify(body)
      });
      resetForm();
      await loadHelpTopics();
      Alert.alert("Help Manager", editingId ? "Help topic updated." : "Help topic added.");
    } catch (error) {
      Alert.alert("Help Manager", error instanceof Error ? error.message : "Could not save help topic");
    } finally {
      setLoading(false);
    }
  }

  async function toggleTopic(topic: BackendHelpTopic) {
    try {
      setLoading(true);
      await apiRequest<{ topic: BackendHelpTopic }>(`/admin/help-topics/${topic.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ isActive: !topic.isActive })
      });
      await loadHelpTopics();
    } catch (error) {
      Alert.alert("Help Manager", error instanceof Error ? error.message : "Could not change topic status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.card}>
      <SectionHeader title="Help Manager" action="Refresh" onAction={loadHelpTopics} />
      {loading ? <ActivityIndicator color={colors.brand600} /> : null}

      <Text style={styles.mutedText}>Create simple Help topics. Normal users see only active topics for their role.</Text>
      <Input label="Title" value={form.title} onChangeText={(value) => setForm((current) => ({ ...current, title: value }))} />
      <Input label="Short description" value={form.shortDescription} onChangeText={(value) => setForm((current) => ({ ...current, shortDescription: value }))} />
      <TextArea label="Full content" value={form.content} onChangeText={(value) => setForm((current) => ({ ...current, content: value }))} />
      <TextArea label="Steps - one step per line" value={form.stepsText} onChangeText={(value) => setForm((current) => ({ ...current, stepsText: value }))} />

      <Text style={styles.inputLabel}>Role</Text>
      <OptionList
        items={helpTopicRoleOptions.map((role: string) => ({ id: role }))}
        selectedId={form.role}
        emptyText="No roles."
        onSelect={(value) => setForm((current) => ({ ...current, role: value as HelpTopicRole }))}
        renderLabel={(item: any) => formatRole(item.id)}
      />

      <Text style={styles.inputLabel}>Category</Text>
      <OptionList
        items={helpTopicCategoryOptions.map((category: string) => ({ id: category }))}
        selectedId={form.category}
        emptyText="No categories."
        onSelect={(value) => setForm((current) => ({ ...current, category: value as HelpTopicCategory }))}
        renderLabel={(item: any) => item.id.replace("_", " ")}
      />

      <Text style={styles.inputLabel}>Related screen</Text>
      <OptionList
        items={helpRouteOptions}
        selectedId={form.relatedRoute}
        emptyText="No routes."
        onSelect={(value) => setForm((current) => ({ ...current, relatedRoute: value }))}
        renderLabel={(item: any) => item.label}
      />

      <Input label="Video URL optional" value={form.videoUrl} onChangeText={(value) => setForm((current) => ({ ...current, videoUrl: value }))} />
      <Input label="Sort order" value={form.sortOrder} onChangeText={(value) => setForm((current) => ({ ...current, sortOrder: value }))} keyboardType="numeric" />

      <View style={styles.statusActions}>
        <Pressable style={[styles.statusButton, form.isActive && styles.statusButtonActive]} onPress={() => setForm((current) => ({ ...current, isActive: true }))}>
          <Text style={[styles.statusButtonText, form.isActive && styles.statusButtonTextActive]}>Active</Text>
        </Pressable>
        <Pressable style={[styles.statusButton, !form.isActive && styles.statusButtonActive]} onPress={() => setForm((current) => ({ ...current, isActive: false }))}>
          <Text style={[styles.statusButtonText, !form.isActive && styles.statusButtonTextActive]}>Inactive</Text>
        </Pressable>
      </View>

      <PrimaryButton label={editingId ? "Update help topic" : "Add help topic"} onPress={saveTopic} loading={loading} />
      {editingId ? (
        <Pressable style={styles.secondaryButton} onPress={resetForm}>
          <Text style={styles.secondaryButtonText}>Cancel edit</Text>
        </Pressable>
      ) : null}

      <View style={styles.spacer} />
      <Text style={styles.detailSectionTitle}>Topic list</Text>
      <Input label="Search topics" value={search} onChangeText={setSearch} />
      <Text style={styles.inputLabel}>Role filter</Text>
      <OptionList
        items={["ALL_ROLES", ...helpTopicRoleOptions].map((role) => ({ id: role }))}
        selectedId={roleFilter}
        emptyText="No filters."
        onSelect={(value) => setRoleFilter(value as HelpTopicRole | "ALL_ROLES")}
        renderLabel={(item) => item.id === "ALL_ROLES" ? "All Roles" : formatRole(item.id)}
      />
      <Text style={styles.inputLabel}>Status filter</Text>
      <OptionList
        items={["ALL", "ACTIVE", "INACTIVE"].map((status) => ({ id: status }))}
        selectedId={activeFilter}
        emptyText="No filters."
        onSelect={(value) => setActiveFilter(value as "ALL" | "ACTIVE" | "INACTIVE")}
        renderLabel={(item) => item.id}
      />

      {filteredTopics.length === 0 ? (
        <Text style={styles.mutedText}>No help topics yet. Add one above.</Text>
      ) : (
        filteredTopics.map((topic) => (
          <View key={topic.id} style={styles.adminListBlock}>
            <Text style={styles.listTitle}>{topic.title}</Text>
            <Text style={styles.listSubtitle}>
              {formatRole(topic.role)} - {topic.category.replace("_", " ")} - {topic.isActive ? "Active" : "Inactive"}
            </Text>
            <Text style={styles.detailLine}>{topic.shortDescription}</Text>
            <View style={styles.statusActions}>
              <Pressable style={styles.adminActionButton} onPress={() => startEdit(topic)}>
                <Text style={styles.adminActionText}>Edit</Text>
              </Pressable>
              <Pressable style={topic.isActive ? styles.adminDangerButton : styles.adminActionButton} onPress={() => toggleTopic(topic)}>
                <Text style={topic.isActive ? styles.adminDangerText : styles.adminActionText}>{topic.isActive ? "Deactivate" : "Activate"}</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function ReportBlock({ title, rows }: { title: string; rows: CountAmountRow[] }) {
  return (
    <View style={styles.reportBlock}>
      <Text style={styles.detailSectionTitle}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={styles.mutedText}>No data.</Text>
      ) : (
        rows.map((row, index) => (
          <View key={`${title}-${index}`} style={styles.reportRow}>
            <Text style={styles.reportRowLabel}>{row.role ? formatRole(row.role) : (row.status ?? row.type ?? "Item").replaceAll("_", " ")}</Text>
            <Text style={styles.reportRowValue}>
              {row.count}{typeof row.amount !== "undefined" ? ` - ${formatMoney(row.amount)}` : ""}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function AdminUserDetailCard({
  user,
  onClose,
  onStatusChange,
  resetPassword,
  onResetPasswordChange,
  onResetPassword,
  onConfirmPayment,
  onToggleProfileAccess
}: {
  user: AdminUserDetail;
  onClose: () => void;
  onStatusChange: (status: UserStatus) => void;
  resetPassword: string;
  onResetPasswordChange: (value: string) => void;
  onResetPassword: () => void;
  onConfirmPayment: () => void;
  onToggleProfileAccess?: (userId: string, currentStatus: boolean) => void;
}) {
  const receivedTotal = (user.commissions ?? []).reduce((sum, commission) => sum + Number(commission.amount), 0);
  const orderTotal = (user.orders ?? []).reduce((sum, order) => sum + Number(order.totalAmount), 0);

  return (
    <View style={styles.userDetailCard}>
      <View style={styles.productDetailHeader}>
        <Text style={styles.productDetailTitle}>{user.name}</Text>
        <Pressable style={styles.detailCloseButton} onPress={onClose}>
          <Text style={styles.detailCloseText}>Close</Text>
        </Pressable>
      </View>

      <Text style={styles.detailLine}>Phone: {user.phone}</Text>
      <Text style={styles.detailLine}>Role: {formatRole(user.role)}</Text>
      <Text style={styles.detailLine}>Status: {user.status}</Text>
      <Text style={styles.detailLine}>Referral: {user.referralCode}</Text>
      <Text style={styles.detailLine}>Placement: {user.placementType ?? "NORMAL"}</Text>
      <Text style={styles.detailLine}>
        Joining payment: {user.companyPaymentConfirmedAt ? "Confirmed" : "Pending"}
      </Text>

      {user.role === "CUSTOMER" ? (
        <>
          <Text style={styles.detailSectionTitle}>Profile Security State</Text>
          <Text style={styles.detailLine}>
            Profile status: <Text style={{ fontWeight: "bold", color: user.profileUnlocked ? colors.brand600 : colors.danger }}>{user.profileUnlocked ? "Unlocked / Allowed" : "Locked / Restricted"}</Text>
          </Text>
          <Pressable
            style={[styles.adminActionButton, { backgroundColor: user.profileUnlocked ? colors.danger : colors.brand600, marginTop: 8 }]}
            onPress={() => onToggleProfileAccess && onToggleProfileAccess(user.id, !!user.profileUnlocked)}
          >
            <Text style={[styles.adminActionText, { color: colors.white }]}>
              {user.profileUnlocked ? "Block Profile Access" : "Unblock Profile Access"}
            </Text>
          </Pressable>
        </>
      ) : null}

      {user.role !== "ADMIN" ? (
        <>
          <Text style={styles.detailSectionTitle}>Change status</Text>
          <View style={styles.statusActions}>
            {userStatusOptions.map((status) => (
              <Pressable
                key={status}
                style={[styles.statusButton, user.status === status && styles.statusButtonActive]}
                onPress={() => onStatusChange(status)}
              >
                <Text style={[styles.statusButtonText, user.status === status && styles.statusButtonTextActive]}>{status}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.detailSectionTitle}>Reset password</Text>
          <Input label="New password" value={resetPassword} onChangeText={onResetPasswordChange} secureTextEntry />
          <Pressable style={styles.adminDangerButton} onPress={onResetPassword}>
            <Text style={styles.adminDangerText}>Reset password</Text>
          </Pressable>

          {!user.companyPaymentConfirmedAt && user.role !== "MANAGER" ? (
            <>
              <Text style={styles.detailSectionTitle}>Joining payment</Text>
              <Pressable style={styles.adminActionButton} onPress={onConfirmPayment}>
                <Text style={styles.adminActionText}>Confirm company payment</Text>
              </Pressable>
            </>
          ) : null}
        </>
      ) : null}

      <Text style={styles.detailSectionTitle}>Sponsor</Text>
      {user.sponsor ? (
        <TreeUserRow user={user.sponsor} depth={0} />
      ) : (
        <Text style={styles.mutedText}>No sponsor. This is a root/company-level user.</Text>
      )}

      <Text style={styles.detailSectionTitle}>Direct Representatives ({user.downline?.length ?? 0})</Text>
      {(user.downline ?? []).length === 0 ? (
        <Text style={styles.mutedText}>No direct representatives.</Text>
      ) : (
        user.downline!.map((child) => <TreeUserRow key={child.id} user={child} depth={0} />)
      )}

      <View style={styles.adminGrid}>
        <MetricCard label="Orders total" value={formatMoney(orderTotal)} />
        <MetricCard label="Commission" value={formatMoney(receivedTotal)} />
      </View>

      <Text style={styles.detailSectionTitle}>Recent orders</Text>
      {(user.orders ?? []).length === 0 ? (
        <Text style={styles.mutedText}>No customer orders.</Text>
      ) : (
        user.orders!.map((order) => (
          <ListItem
            key={order.id}
            title={formatMoney(order.totalAmount)}
            subtitle={`${order.status} - ${order.paymentStatus}`}
            right={order.items?.map((item) => item.product?.name).filter(Boolean).join(", ")}
          />
        ))
      )}

      <Text style={styles.detailSectionTitle}>Collected orders</Text>
      {(user.collectedOrders ?? []).length === 0 ? (
        <Text style={styles.mutedText}>No collected orders.</Text>
      ) : (
        user.collectedOrders!.map((order) => (
          <ListItem
            key={order.id}
            title={order.customer?.name ?? "Customer"}
            subtitle={`${formatMoney(order.totalAmount)} - ${order.paymentStatus}`}
          />
        ))
      )}

      <Text style={styles.detailSectionTitle}>Received commissions</Text>
      {(user.commissions ?? []).length === 0 ? (
        <Text style={styles.mutedText}>No received commissions.</Text>
      ) : (
        user.commissions!.map((commission) => (
          <ListItem
            key={commission.id}
            title={formatMoney(commission.amount)}
            subtitle={`${commission.type.replaceAll("_", " ")} - ${commission.status}`}
            right={commission.sourceUser?.name}
          />
        ))
      )}
    </View>
  );
}

function OrderDetailCard({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <View style={styles.userDetailCard}>
      <View style={styles.productDetailHeader}>
        <Text style={styles.productDetailTitle}>{order.customer?.name ?? "Order"}</Text>
        <Pressable style={styles.detailCloseButton} onPress={onClose}>
          <Text style={styles.detailCloseText}>Close</Text>
        </Pressable>
      </View>
      <Text style={styles.detailLine}>Total: {formatMoney(order.totalAmount)}</Text>
      <Text style={styles.detailLine}>Order status: {order.status}</Text>
      <Text style={styles.detailLine}>Payment status: {order.paymentStatus}</Text>
      <Text style={styles.detailSectionTitle}>Products</Text>
      {(order.items ?? []).length === 0 ? (
        <Text style={styles.mutedText}>No items loaded for this order.</Text>
      ) : (
        order.items!.map((item, index) => (
          <Text key={`${item.product?.id ?? index}`} style={styles.detailText}>
            {item.product?.name ?? "Product"} x {item.quantity}
          </Text>
        ))
      )}
    </View>
  );
}

function AuditDetailCard({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  return (
    <View style={styles.userDetailCard}>
      <View style={styles.productDetailHeader}>
        <Text style={styles.productDetailTitle}>{log.action.replaceAll("_", " ")}</Text>
        <Pressable style={styles.detailCloseButton} onPress={onClose}>
          <Text style={styles.detailCloseText}>Close</Text>
        </Pressable>
      </View>
      <Text style={styles.detailLine}>Entity: {log.entityType}</Text>
      <Text style={styles.detailLine}>Actor: {log.actor?.name ?? "System"}</Text>
      <Text style={styles.detailLine}>Time: {new Date(log.createdAt).toLocaleString()}</Text>
      <Text style={styles.detailSectionTitle}>Metadata</Text>
      <Text style={styles.detailText}>{JSON.stringify(log.metadata ?? {}, null, 2)}</Text>
    </View>
  );
}

function MatrixDetailCard({ matrix }: { matrix: Matrix }) {
  const percent = Math.min(100, Math.round((matrix.confirmedCustomers / matrix.requiredCustomers) * 100));

  return (
    <View style={styles.userDetailCard}>
      <Text style={styles.detailLine}>Root Manager: {matrix.rootManager?.name ?? "Manager"}</Text>
      <Text style={styles.detailLine}>Beta Manager: {matrix.betaManager?.name ?? "Beta Manager"}</Text>
      <Text style={styles.detailLine}>Confirmed customers: {matrix.confirmedCustomers} / {matrix.requiredCustomers}</Text>
      <Text style={styles.detailLine}>Progress: {percent}%</Text>
      <Text style={styles.detailLine}>Held amount: {formatMoney(matrix.pendingAmount)}</Text>
      <Text style={styles.detailLine}>Completion payout: {formatMoney(matrix.completionAmount)}</Text>
      <Text style={styles.detailLine}>Status: {matrix.status}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

function SystemStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const style =
    normalized === "critical"
      ? styles.systemBadgeCritical
      : normalized === "warning"
        ? styles.systemBadgeWarning
        : normalized === "healthy" || normalized === "ready"
          ? styles.systemBadgeHealthy
          : styles.systemBadgeNeutral;

  return (
    <View style={[styles.systemBadge, style]}>
      <Text style={styles.systemBadgeText}>{status.replaceAll("_", " ")}</Text>
    </View>
  );
}

function SystemInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.systemInfoRow}>
      <Text style={styles.systemInfoLabel}>{label}</Text>
      <Text style={styles.systemInfoValue}>{value}</Text>
    </View>
  );
}

function SystemMiniStat({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <View style={styles.systemMiniStat}>
      <Text style={styles.systemMiniValue}>{value ?? 0}</Text>
      <Text style={styles.systemMiniLabel}>{label}</Text>
    </View>
  );
}

function AdminSectionTabs({ active, onChange }: { active: AdminSection; onChange: (section: AdminSection) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adminSectionTabs}>
      {adminSections.map((section) => (
        <Pressable
          key={section.key}
          style={[styles.adminSectionTab, active === section.key && styles.adminSectionTabActive]}
          onPress={() => onChange(section.key)}
        >
          <Text style={[styles.adminSectionTabText, active === section.key && styles.adminSectionTabTextActive]}>
            {section.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function emptyHelpForm() {
  return {
    title: "",
    shortDescription: "",
    content: "",
    role: "ALL" as HelpTopicRole,
    category: "FAQ" as HelpTopicCategory,
    stepsText: "",
    relatedRoute: "",
    videoUrl: "",
    isActive: true,
    sortOrder: "0"
  };
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
  adminGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12
  },
  adminListBlock: {
    backgroundColor: colors.slate50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 12,
    marginBottom: 10
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.slate900
  },
  listSubtitle: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 4,
    marginBottom: 6
  },
  detailLine: {
    fontSize: 13,
    color: colors.slate700,
    marginBottom: 4
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate900,
    marginTop: 12,
    marginBottom: 6
  },
  detailText: {
    fontSize: 13,
    color: colors.slate700,
    lineHeight: 18,
    marginBottom: 4
  },
  statusActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10
  },
  statusButton: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: colors.white
  },
  statusButtonActive: {
    borderColor: colors.brand500,
    backgroundColor: colors.brand50
  },
  statusButtonText: {
    fontSize: 11,
    color: colors.slate700
  },
  statusButtonTextActive: {
    color: colors.brand700,
    fontWeight: "600"
  },
  adminActionButton: {
    backgroundColor: colors.brand50,
    borderColor: colors.brand200,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8
  },
  adminActionText: {
    color: colors.brand700,
    fontSize: 12,
    fontWeight: "600"
  },
  adminDangerButton: {
    backgroundColor: "#fef3c7",
    borderColor: "#f59e0b",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8
  },
  adminDangerText: {
    color: "#b45309",
    fontSize: 12,
    fontWeight: "600"
  },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8
  },
  secondaryButtonText: {
    color: colors.slate500,
    fontSize: 14,
    fontWeight: "600"
  },
  spacer: {
    height: 14
  },
  reportBlock: {
    backgroundColor: colors.slate50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 12,
    marginBottom: 10
  },
  reportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200
  },
  reportRowLabel: {
    fontSize: 13,
    color: colors.slate700,
    textTransform: "capitalize"
  },
  reportRowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate900
  },
  reportText: {
    fontFamily: "monospace",
    fontSize: 11,
    color: colors.slate700,
    backgroundColor: colors.slate50,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.slate200,
    marginTop: 10
  },
  productDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10
  },
  productDetailTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.slate900
  },
  productCategoryText: {
    fontSize: 11,
    color: colors.brand600,
    fontWeight: "700"
  },
  detailCloseButton: {
    backgroundColor: colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  detailCloseText: {
    fontSize: 11,
    color: colors.slate700
  },
  userDetailCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.brand500,
    padding: 14,
    marginBottom: 12
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.slate200,
    borderRadius: 4,
    marginTop: 10,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.brand600
  },
  systemStack: {
    gap: 12
  },
  systemHeroCard: {
    backgroundColor: colors.brand900,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  systemHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  systemHeroIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center"
  },
  systemHeroIconText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.brand900
  },
  systemHeroCopy: {
    flex: 1,
    marginLeft: 10
  },
  systemHeroTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.white
  },
  systemHeroText: {
    fontSize: 11,
    color: colors.brand100
  },
  systemErrorText: {
    color: "#fca5a5",
    fontSize: 12,
    marginTop: 8
  },
  systemSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  systemProgressTrack: {
    height: 6,
    backgroundColor: colors.slate100,
    borderRadius: 3,
    marginVertical: 10,
    overflow: "hidden"
  },
  systemProgressFill: {
    height: "100%",
    backgroundColor: colors.brand500
  },
  systemProgressCritical: {
    backgroundColor: colors.danger
  },
  systemProgressWarning: {
    backgroundColor: "#f59e0b"
  },
  systemTableRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
    paddingVertical: 8
  },
  systemTableTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  productPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate900
  },
  systemCountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  systemMiniStat: {
    flexGrow: 1,
    flexBasis: "28%",
    backgroundColor: colors.slate50,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 8,
    alignItems: "center"
  },
  systemMiniValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate900
  },
  systemMiniLabel: {
    fontSize: 10,
    color: colors.slate500,
    marginTop: 2
  },
  systemFileRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100
  },
  systemWarningCard: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8
  },
  systemWarningText: {
    color: "#b45309",
    fontSize: 12,
    lineHeight: 18
  },
  systemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  systemBadgeText: {
    fontSize: 10,
    fontWeight: "700"
  },
  systemBadgeHealthy: {
    backgroundColor: "#d1fae5",
    color: "#065f46"
  },
  systemBadgeWarning: {
    backgroundColor: "#fef3c7",
    color: "#92400e"
  },
  systemBadgeCritical: {
    backgroundColor: "#fee2e2",
    color: "#991b1b"
  },
  systemBadgeNeutral: {
    backgroundColor: colors.slate100,
    color: colors.slate700
  },
  systemInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4
  },
  systemInfoLabel: {
    fontSize: 12,
    color: colors.slate500
  },
  systemInfoValue: {
    fontSize: 12,
    color: colors.slate900,
    fontWeight: "600"
  },
  adminSectionTabs: {
    gap: 8,
    marginBottom: 16
  },
  adminSectionTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200
  },
  adminSectionTabActive: {
    backgroundColor: colors.brand500,
    borderColor: colors.brand500
  },
  adminSectionTabText: {
    fontSize: 12,
    color: colors.slate700,
    fontWeight: "600"
  },
  adminSectionTabTextActive: {
    color: colors.white
  },
  matrixBox: {
    backgroundColor: colors.slate50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 12,
    marginBottom: 10
  },
  exportSectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.slate900,
    marginTop: 18,
    marginBottom: 8
  },
  exportButtonGroup: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  exportButton: {
    flex: 1,
    backgroundColor: colors.brand600,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  exportButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700"
  },
  exportLoader: {
    marginVertical: 6
  }
});
