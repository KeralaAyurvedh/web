import { Alert } from "react-native";
import { CountAmountRow, AdminReport } from "../constants/types";

declare const process: { env?: { EXPO_PUBLIC_API_URL?: string } } | undefined;

export const API_URL =
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL
    ? process.env.EXPO_PUBLIC_API_URL
    : "http://10.156.218.252:4000";

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : "Request failed";
    throw new Error(message);
  }

  return data as T;
}

export function formatMoney(value: string | number) {
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
}

export function formatBytes(value: number | null | undefined) {
  const bytes = Number(value ?? 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString();
}

export function formatRole(role?: string | null): string {
  if (!role) return "N/A";
  if (role === "LEVEL_1") return "Main Pillar";
  if (role === "LEVEL_2") return "Downline";
  return role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCountAmount(row: CountAmountRow) {
  let label = row.status ?? row.type ?? row.role ?? "Item";
  if (row.role) {
    label = formatRole(row.role);
  } else {
    label = label.replaceAll("_", " ");
  }
  return `${label}: ${row.count}${typeof row.amount !== "undefined" ? ` - ${formatMoney(row.amount)}` : ""}`;
}

export function buildReportText(report: AdminReport) {
  const lines = [
    "Kerala Ayurvedh Admin Report",
    `From: ${report.filters.from || "All time"}`,
    `To: ${report.filters.to || "Today"}`,
    "",
    "Users by role",
    ...report.users.byRole.map(formatCountAmount),
    "",
    "Orders by status",
    ...report.orders.byStatus.map(formatCountAmount),
    "",
    "Commissions by status",
    ...report.commissions.byStatus.map(formatCountAmount),
    "",
    "Payment handovers",
    ...report.payments.handoversByStatus.map(formatCountAmount),
    "",
    `Total stock: ${report.stock.totalStock}`,
    `Low stock products: ${report.stock.lowStockCount}`,
    ...report.stock.lowStockProducts.map((product) => `${product.name}: ${product.stock ?? 0}`)
  ];
  return lines.join("\n");
}

export function mediaUrl(path?: string | null) {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_URL}${path}`;
}

export function confirmAction(title: string, message: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", style: "destructive", onPress: onConfirm }
  ]);
}
