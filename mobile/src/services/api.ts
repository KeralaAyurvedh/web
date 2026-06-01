import { Alert } from "react-native";
import { CountAmountRow, AdminReport } from "../constants/types";

declare const process: { env?: { EXPO_PUBLIC_API_URL?: string } } | undefined;

const defaultApiUrl = "https://web-laqb.onrender.com";

export const API_URL = (
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL
    ? process.env.EXPO_PUBLIC_API_URL
    : defaultApiUrl
).replace(/\/+$/, "");

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {})
      }
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof data?.error === "string" ? data.error : "Request failed";
      throw new Error(message);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please check your internet connection and try again.");
    }
    throw error;
  }
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

export function formatRole(role?: string | null, isAdmin?: boolean): string {
  if (!role) return "N/A";
  const r = role.toUpperCase();
  if (r === "ADMIN") return "Admin";
  if (r === "MANAGER") return "a3 (Manager)";
  if (r === "BETA_MANAGER") return "a3 (Beta Manager)";
  if (r === "LEVEL_1") return "a2 (Main Pillar)";
  if (r === "LEVEL_2") return "a1 (Downline)";
  if (r === "CUSTOMER") return "Customer";
  return role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCountAmount(row: CountAmountRow, isAdmin?: boolean) {
  let label = row.status ?? row.type ?? row.role ?? "Item";
  if (row.role) {
    label = formatRole(row.role, isAdmin);
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
    ...report.users.byRole.map((row) => formatCountAmount(row, true)),
    "",
    "Orders by status",
    ...report.orders.byStatus.map((row) => formatCountAmount(row, true)),
    "",
    "Commissions by status",
    ...report.commissions.byStatus.map((row) => formatCountAmount(row, true)),
    "",
    "Payment handovers",
    ...report.payments.handoversByStatus.map((row) => formatCountAmount(row, true)),
    "",
    `Total stock: ${report.stock.totalStock}`,
    `Low stock products: ${report.stock.lowStockCount}`,
    ...report.stock.lowStockProducts.map((product) => `${product.name}: ${product.stock ?? 0}`)
  ];
  return lines.join("\n");
}

export function mediaUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${cleanPath}`;
}

export function confirmAction(title: string, message: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", style: "destructive", onPress: onConfirm }
  ]);
}
