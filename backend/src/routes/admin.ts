import { Router } from "express";
import fs from "fs/promises";
import type { Dirent } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import {
  ApplicationStatus,
  CommissionStatus,
  CommissionType,
  FileAssetCategory,
  HelpTopicCategory,
  HelpTopicRole,
  OrderStatus,
  PaymentHandoverStatus,
  PaymentStatus,
  PlacementType,
  ProductAvailability,
  ReassignmentStatus,
  Role,
  StockAdjustmentType,
  UpgradeStatus,
  UserStatus
} from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireRoles } from "../middlewares/auth";
import { prisma } from "../utils/prisma";
import { config } from "../utils/config";
import { writeAuditLog } from "../utils/audit";
import { sendLoginCredentialsEmail } from "../utils/email";
import { assertCanAddDownline, assertCanCreateBetaManager } from "../services/networkRules";
import { getSignedViewUrl, uploadFile } from "../services/storage";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRoles(Role.ADMIN));

function referralCodeFromPhone(phone: string) {
  const tail = phone.replace(/\D/g, "").slice(-6).padStart(6, "0");
  return `KA${tail}${Math.floor(Math.random() * 900 + 100)}`;
}

function dateRangeFromQuery(query: { from?: unknown; to?: unknown }) {
  const from = typeof query.from === "string" && query.from ? new Date(query.from) : undefined;
  const to = typeof query.to === "string" && query.to ? new Date(query.to) : undefined;

  return {
    ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}),
    ...(to && !Number.isNaN(to.getTime()) ? { lte: to } : {})
  };
}

function numberValue(value: unknown) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toString" in value) return Number(value.toString());
  return 0;
}

function isoOrNull(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDuration(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function storageStatus(sizeBytes: number) {
  const limitMb = config.databaseStorageLimitMb;
  if (!limitMb || Number.isNaN(limitMb) || limitMb <= 0) {
    return {
      storageLimitMb: null,
      usedPercent: null,
      status: "limit_not_configured"
    };
  }

  const usedPercent = Number(((sizeBytes / (limitMb * 1024 * 1024)) * 100).toFixed(2));
  return {
    storageLimitMb: limitMb,
    usedPercent,
    status: usedPercent >= 85 ? "critical" : usedPercent >= 60 ? "warning" : "healthy"
  };
}

function storagePath(root: string) {
  return path.isAbsolute(root) ? root : path.join(process.cwd(), root);
}

async function attachPaymentProofFiles<T extends { id: string; proofUrl?: string | null }>(handovers: T[]) {
  const fileIds = handovers.map((handover) => handover.proofUrl).filter((id): id is string => Boolean(id));
  const relatedIds = handovers.map((handover) => handover.id);
  const files = await prisma.fileAsset.findMany({
    where: {
      category: FileAssetCategory.PAYMENT_PROOF,
      OR: [
        { id: { in: fileIds } },
        { relatedEntityType: "PaymentHandover", relatedEntityId: { in: relatedIds } }
      ]
    },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      relatedEntityId: true,
      createdAt: true
    }
  });

  return handovers.map((handover) => ({
    ...handover,
    proofFile: files.find((file) => file.id === handover.proofUrl || file.relatedEntityId === handover.id) ?? null
  }));
}

async function folderStats(root: string) {
  const files: Array<{ relativeName: string; category: string; sizeBytes: number }> = [];

  async function walk(dir: string, relativeBase = "") {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      const relativeName = path.join(relativeBase, entry.name).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        await walk(absolute, relativeName);
      } else if (entry.isFile()) {
        const stat = await fs.stat(absolute);
        const lower = relativeName.toLowerCase();
        const category = lower.includes("aadhaar")
          ? "aadhaar"
          : lower.includes("pan")
            ? "pan"
            : lower.includes("proof") || lower.includes("payment")
              ? "payment_proof"
              : lower.startsWith("applications/")
                ? "applications"
                : lower.startsWith("products/")
                  ? "products"
                  : "other";
        files.push({ relativeName, category, sizeBytes: stat.size });
      }
    }
  }

  await walk(root);
  return files;
}

adminRouter.get("/dashboard", async (_req, res) => {
  const [
    totalUsers,
    totalProducts,
    activeProducts,
    comingSoonProducts,
    outOfStockProducts,
    lowStockProducts,
    pendingUserPayments,
    pendingOrderPayments,
    pendingApplications,
    commissionTotals,
    matrices
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true, availability: ProductAvailability.COMING_SOON } }),
    prisma.product.count({ where: { isActive: true, stock: { lte: 0 }, availability: ProductAvailability.AVAILABLE } }),
    prisma.product.findMany({
      where: { isActive: true, stock: { lte: 5 }, availability: ProductAvailability.AVAILABLE },
      select: { id: true, name: true, category: true, stock: true, availability: true },
      orderBy: [{ stock: "asc" }, { name: "asc" }],
      take: 10
    }),
    prisma.user.count({
      where: {
        role: { in: [Role.BETA_MANAGER, Role.LEVEL_1, Role.LEVEL_2, Role.CUSTOMER] },
        companyPaymentConfirmedAt: null
      }
    }),
    prisma.order.count({ where: { paymentStatus: PaymentStatus.PENDING } }),
    prisma.memberApplication.count({ where: { status: ApplicationStatus.PENDING } }),
    prisma.commissionLedger.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: { id: true }
    }),
    prisma.betaMatrix.findMany({
      include: {
        rootManager: { select: { name: true, phone: true } },
        betaManager: { select: { name: true, phone: true } }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return res.json({
    stats: {
      totalUsers,
      totalProducts,
      activeProducts,
      comingSoonProducts,
      outOfStockProducts,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      pendingUserPayments,
      pendingOrderPayments,
      pendingApplications,
      commissions: commissionTotals.map((item) => ({
        status: item.status,
        count: item._count.id,
        amount: item._sum.amount ?? 0
      })),
      matrices
    }
  });
});

adminRouter.get("/reports", async (req, res) => {
  const createdAt = dateRangeFromQuery(req.query);
  const createdAtFilter = Object.keys(createdAt).length > 0 ? { createdAt } : {};

  const [
    usersByRole,
    usersByStatus,
    ordersByStatus,
    ordersByPaymentStatus,
    commissionByStatus,
    commissionByType,
    handoversByStatus,
    products,
    recentOrders,
    recentCommissions
  ] = await Promise.all([
    prisma.user.groupBy({
      by: ["role"],
      where: createdAtFilter,
      _count: { id: true }
    }),
    prisma.user.groupBy({
      by: ["status"],
      where: createdAtFilter,
      _count: { id: true }
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: createdAtFilter,
      _count: { id: true },
      _sum: { totalAmount: true }
    }),
    prisma.order.groupBy({
      by: ["paymentStatus"],
      where: createdAtFilter,
      _count: { id: true },
      _sum: { totalAmount: true }
    }),
    prisma.commissionLedger.groupBy({
      by: ["status"],
      where: createdAtFilter,
      _count: { id: true },
      _sum: { amount: true }
    }),
    prisma.commissionLedger.groupBy({
      by: ["type"],
      where: createdAtFilter,
      _count: { id: true },
      _sum: { amount: true }
    }),
    prisma.paymentHandover.groupBy({
      by: ["status"],
      where: createdAtFilter,
      _count: { id: true },
      _sum: { amount: true }
    }),
    prisma.product.findMany({
      select: { id: true, name: true, category: true, stock: true, availability: true, isActive: true },
      orderBy: [{ stock: "asc" }, { name: "asc" }]
    }),
    prisma.order.findMany({
      where: createdAtFilter,
      include: {
        customer: { select: { name: true, phone: true, role: true } },
        items: { include: { product: { select: { name: true } } } }
      },
      orderBy: { createdAt: "desc" },
      take: 25
    }),
    prisma.commissionLedger.findMany({
      where: createdAtFilter,
      include: {
        receiver: { select: { name: true, phone: true, role: true } },
        sourceUser: { select: { name: true, phone: true, role: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 25
    })
  ]);

  const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
  const lowStockProducts = products.filter((product) => product.isActive && product.stock <= 5);

  return res.json({
    report: {
      filters: {
        from: req.query.from ?? null,
        to: req.query.to ?? null
      },
      users: {
        byRole: usersByRole.map((item) => ({ role: item.role, count: item._count.id })),
        byStatus: usersByStatus.map((item) => ({ status: item.status, count: item._count.id }))
      },
      orders: {
        byStatus: ordersByStatus.map((item) => ({ status: item.status, count: item._count.id, amount: item._sum.totalAmount ?? 0 })),
        byPaymentStatus: ordersByPaymentStatus.map((item) => ({ status: item.paymentStatus, count: item._count.id, amount: item._sum.totalAmount ?? 0 })),
        recent: recentOrders
      },
      commissions: {
        byStatus: commissionByStatus.map((item) => ({ status: item.status, count: item._count.id, amount: item._sum.amount ?? 0 })),
        byType: commissionByType.map((item) => ({ type: item.type, count: item._count.id, amount: item._sum.amount ?? 0 })),
        recent: recentCommissions
      },
      payments: {
        handoversByStatus: handoversByStatus.map((item) => ({ status: item.status, count: item._count.id, amount: item._sum.amount ?? 0 }))
      },
      stock: {
        totalStock,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        products
      }
    }
  });
});

adminRouter.get("/reports/orders/export", async (req, res) => {
  const createdAt = dateRangeFromQuery(req.query);
  const createdAtFilter = Object.keys(createdAt).length > 0 ? { createdAt } : {};

  const orders = await prisma.order.findMany({
    where: createdAtFilter,
    include: {
      customer: { select: { name: true, phone: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  let csv = "Order ID,Customer Name,Customer Phone,Status,Payment Status,Total Amount,Created At\n";
  for (const o of orders) {
    const name = o.customer.name.replace(/"/g, '""');
    csv += `"${o.id}","${name}","${o.customer.phone}","${o.status}","${o.paymentStatus}",${o.totalAmount},"${o.createdAt.toISOString()}"\n`;
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=orders_export_${Date.now()}.csv`);
  return res.status(200).send(csv);
});

adminRouter.get("/reports/payments/export", async (req, res) => {
  const createdAt = dateRangeFromQuery(req.query);
  const createdAtFilter = Object.keys(createdAt).length > 0 ? { createdAt } : {};

  const handovers = await prisma.paymentHandover.findMany({
    where: createdAtFilter,
    include: {
      fromUser: { select: { name: true, phone: true } },
      toUser: { select: { name: true, phone: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  let csv = "Handover ID,Order ID,Sender Name,Sender Phone,Receiver Name,Receiver Phone,Amount,Status,Created At\n";
  for (const h of handovers) {
    const fromName = h.fromUser ? h.fromUser.name.replace(/"/g, '""') : "N/A";
    const fromPhone = h.fromUser ? h.fromUser.phone : "N/A";
    const toName = h.toUser ? h.toUser.name.replace(/"/g, '""') : "N/A";
    const toPhone = h.toUser ? h.toUser.phone : "N/A";
    csv += `"${h.id}","${h.orderId ?? "N/A"}","${fromName}","${fromPhone}","${toName}","${toPhone}",${h.amount},"${h.status}","${h.createdAt.toISOString()}"\n`;
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=payments_export_${Date.now()}.csv`);
  return res.status(200).send(csv);
});

adminRouter.get("/reports/commissions/export", async (req, res) => {
  const createdAt = dateRangeFromQuery(req.query);
  const createdAtFilter = Object.keys(createdAt).length > 0 ? { createdAt } : {};

  const commissions = await prisma.commissionLedger.findMany({
    where: createdAtFilter,
    include: {
      receiver: { select: { name: true, phone: true, role: true } },
      sourceUser: { select: { name: true, phone: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  let csv = "Commission ID,Receiver Name,Receiver Phone,Receiver Role,Source Name,Source Phone,Type,Status,Amount,Created At\n";
  for (const c of commissions) {
    const recName = c.receiver.name.replace(/"/g, '""');
    const srcName = c.sourceUser ? c.sourceUser.name.replace(/"/g, '""') : "N/A";
    const srcPhone = c.sourceUser ? c.sourceUser.phone : "N/A";
    csv += `"${c.id}","${recName}","${c.receiver.phone}","${c.receiver.role}","${srcName}","${srcPhone}","${c.type}","${c.status}",${c.amount},"${c.createdAt.toISOString()}"\n`;
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=commissions_export_${Date.now()}.csv`);
  return res.status(200).send(csv);
});


adminRouter.get("/system/database-stats", async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const warnings: string[] = [];
    const overviewRows = await prisma.$queryRaw<Array<{
      database_name: string;
      size_bytes: bigint;
      size_pretty: string;
      postgres_version: string;
      checked_at: Date;
    }>>`
      SELECT
        current_database() AS database_name,
        pg_database_size(current_database()) AS size_bytes,
        pg_size_pretty(pg_database_size(current_database())) AS size_pretty,
        version() AS postgres_version,
        now() AS checked_at
    `;

    const activeConnectionRows = await prisma.$queryRaw<Array<{ active_connections: bigint }>>`
      SELECT count(*) AS active_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `.catch(() => {
      warnings.push("Active DB connection count is not available for this database user");
      return [];
    });

    const uptimeRows = await prisma.$queryRaw<Array<{ server_uptime: string | null }>>`
      SELECT age(now(), pg_postmaster_start_time())::text AS server_uptime
    `.catch(() => {
      warnings.push("Database server uptime is not available for this database user");
      return [];
    });

    const maxConnectionRows = await prisma.$queryRaw<Array<{ max_connections: string }>>`
      SELECT setting AS max_connections
      FROM pg_settings
      WHERE name = 'max_connections'
    `.catch(() => {
      warnings.push("Max database connection setting is not available for this database user");
      return [];
    });

    const tableRows = await prisma.$queryRaw<Array<{
        table_name: string;
        total_size_bytes: bigint;
        total_size_pretty: string;
        table_size_bytes: bigint;
        table_size_pretty: string;
        index_size_bytes: bigint;
        index_size_pretty: string;
        toast_size_bytes: bigint;
        toast_size_pretty: string;
        estimated_rows: number;
        live_rows: bigint;
        dead_rows: bigint;
        last_vacuum: Date | null;
        last_autovacuum: Date | null;
        last_analyze: Date | null;
        last_autoanalyze: Date | null;
    }>>`
      SELECT
        relname AS table_name,
        pg_total_relation_size(relid) AS total_size_bytes,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size_pretty,
        pg_relation_size(relid) AS table_size_bytes,
        pg_size_pretty(pg_relation_size(relid)) AS table_size_pretty,
        pg_indexes_size(relid) AS index_size_bytes,
        pg_size_pretty(pg_indexes_size(relid)) AS index_size_pretty,
        GREATEST(pg_total_relation_size(relid) - pg_relation_size(relid) - pg_indexes_size(relid), 0) AS toast_size_bytes,
        pg_size_pretty(GREATEST(pg_total_relation_size(relid) - pg_relation_size(relid) - pg_indexes_size(relid), 0)) AS toast_size_pretty,
        COALESCE(c.reltuples, 0)::bigint AS estimated_rows,
        n_live_tup AS live_rows,
        n_dead_tup AS dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables s
      JOIN pg_class c ON c.oid = s.relid
      ORDER BY pg_total_relation_size(relid) DESC
    `.catch(() => {
      warnings.push("Table storage details are not available for this database user");
      return [];
    });

    const counts = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
      prisma.user.count({ where: { status: UserStatus.TERMINATED } }),
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.orderItem.count(),
      prisma.paymentHandover.count(),
      prisma.paymentHandover.count({ where: { status: PaymentHandoverStatus.PENDING } }),
      prisma.commissionLedger.count(),
      prisma.commissionLedger.count({ where: { status: CommissionStatus.PENDING } }),
      prisma.commissionLedger.count({ where: { status: CommissionStatus.PAID } }),
      prisma.betaMatrix.count(),
      prisma.roleUpgradeRequest.count(),
      prisma.reassignmentRequest.count(),
      prisma.memberApplication.count(),
      prisma.memberApplication.count({ where: { status: ApplicationStatus.PENDING } }),
      prisma.productStockAdjustment.count(),
      prisma.auditLog.count()
    ]);

    const overview = overviewRows[0];
    const sizeBytes = numberValue(overview?.size_bytes);
    const storage = storageStatus(sizeBytes);
    const tables = tableRows.map((table) => ({
      tableName: table.table_name,
      totalSizeBytes: numberValue(table.total_size_bytes),
      totalSizePretty: table.total_size_pretty,
      tableSizeBytes: numberValue(table.table_size_bytes),
      tableSizePretty: table.table_size_pretty,
      indexSizeBytes: numberValue(table.index_size_bytes),
      indexSizePretty: table.index_size_pretty,
      toastSizeBytes: numberValue(table.toast_size_bytes),
      toastSizePretty: table.toast_size_pretty,
      estimatedRows: numberValue(table.estimated_rows),
      liveRows: numberValue(table.live_rows),
      deadRows: numberValue(table.dead_rows),
      lastVacuum: isoOrNull(table.last_vacuum),
      lastAutovacuum: isoOrNull(table.last_autovacuum),
      lastAnalyze: isoOrNull(table.last_analyze),
      lastAutoanalyze: isoOrNull(table.last_autoanalyze)
    }));

    const [
      users,
      activeUsers,
      suspendedUsers,
      terminatedUsers,
      products,
      activeProducts,
      orders,
      ordersToday,
      ordersThisMonth,
      orderItems,
      paymentHandovers,
      pendingPaymentHandovers,
      commissions,
      pendingCommissions,
      paidCommissions,
      betaMatrices,
      roleUpgradeRequests,
      reassignmentRequests,
      memberApplications,
      pendingApplications,
      stockAdjustments,
      auditLogs
    ] = counts;

    if (storage.status === "limit_not_configured") warnings.push("DATABASE_STORAGE_LIMIT_MB is not configured");
    if (storage.status === "critical") warnings.push("Database storage usage is above 85%");
    if (storage.status === "warning") warnings.push("Database storage usage is above 60%");
    if (tables.some((table) => table.deadRows > 1000)) warnings.push("High dead rows detected. Vacuum may be needed");
    const activeConnections = numberValue(activeConnectionRows[0]?.active_connections);
    const maxConnections = numberValue(maxConnectionRows[0]?.max_connections);
    if (maxConnections > 0 && activeConnections / maxConnections > 0.8) warnings.push("Too many active DB connections");

    await writeAuditLog({
      actorId: req.user!.id,
      action: "VIEW_SYSTEM_MONITOR",
      entityType: "SystemMonitor",
      metadata: { section: "database-stats" }
    }).catch(() => undefined);

    return res.json({
      database: {
        name: overview?.database_name ?? "unknown",
        sizeBytes,
        sizePretty: overview?.size_pretty ?? "unknown",
        storageLimitMb: storage.storageLimitMb,
        usedPercent: storage.usedPercent,
        status: storage.status,
        postgresVersion: overview?.postgres_version ?? "unknown",
        checkedAt: isoOrNull(overview?.checked_at) ?? new Date().toISOString(),
        serverUptime: uptimeRows[0]?.server_uptime ?? null,
        activeConnections,
        maxConnections: maxConnections || null,
        health: "healthy"
      },
      tables,
      businessCounts: {
        users,
        products,
        orders,
        orderItems,
        paymentHandovers,
        commissions,
        betaMatrices,
        roleUpgradeRequests,
        reassignmentRequests,
        memberApplications,
        stockAdjustments,
        auditLogs
      },
      activity: {
        totalUsers: users,
        activeUsers,
        suspendedUsers,
        terminatedUsers,
        totalProducts: products,
        activeProducts,
        totalOrders: orders,
        ordersToday,
        ordersThisMonth,
        totalCommissions: commissions,
        pendingCommissions,
        paidCommissions,
        pendingPaymentHandovers,
        pendingApplications,
        auditLogs
      },
      warnings
    });
  } catch (error) {
    console.error("Database stats failed", error);
    return res.status(500).json({
      error: "Unable to load database stats"
    });
  }
});

adminRouter.get("/system/storage-stats", async (_req, res) => {
  const publicDir = storagePath(config.storage.localUploadDir);
  const files = await folderStats(publicDir);
  const totalBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
  const [
    fileAssetCount,
    sensitiveFileCount,
    productImageCount,
    paymentProofCount,
    aadhaarFileCount,
    panFileCount
  ] = await Promise.all([
    prisma.fileAsset.count(),
    prisma.fileAsset.count({ where: { isPrivate: true } }),
    prisma.fileAsset.count({ where: { category: FileAssetCategory.PRODUCT_IMAGE } }),
    prisma.fileAsset.count({ where: { category: FileAssetCategory.PAYMENT_PROOF } }),
    prisma.fileAsset.count({ where: { category: FileAssetCategory.AADHAAR_IMAGE } }),
    prisma.fileAsset.count({ where: { category: FileAssetCategory.PAN_IMAGE } })
  ]);
  const largestFiles = [...files]
    .sort((a, b) => b.sizeBytes - a.sizeBytes)
    .slice(0, 10)
    .map((file) => ({
      relativeName: file.relativeName,
      category: file.category,
      sizeBytes: file.sizeBytes
    }));

  const categoryCounts = files.reduce<Record<string, number>>((groups, file) => {
    groups[file.category] = (groups[file.category] ?? 0) + 1;
    return groups;
  }, {});

  const warnings = [
    ...(config.nodeEnv === "production" && config.storage.provider === "local"
      ? ["Local upload storage is being used in production. Cloud storage is recommended."]
      : [])
  ];

  return res.json({
    storage: {
      storageProvider: config.storage.provider,
      totalBytes,
      totalPretty: `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`,
      fileCount: files.length,
      fileAssetCount,
      sensitiveFileCount,
      aadhaarUploads: aadhaarFileCount || categoryCounts.aadhaar || 0,
      panUploads: panFileCount || categoryCounts.pan || 0,
      paymentProofUploads: paymentProofCount || categoryCounts.payment_proof || 0,
      applicationUploads: categoryCounts.applications ?? 0,
      productUploads: productImageCount || categoryCounts.products || 0,
      largestFiles,
      localStorage: config.storage.provider === "local"
    },
    warnings
  });
});

adminRouter.get("/system/health", async (_req, res) => {
  let databaseStatus: "ready" | "unavailable" = "ready";
  let prismaStatus: "ready" | "unavailable" = "ready";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    databaseStatus = "unavailable";
    prismaStatus = "unavailable";
  }

  const memory = process.memoryUsage();
  return res.json({
    health: {
      apiStatus: "ready",
      databaseStatus,
      prismaStatus,
      environment: config.nodeEnv,
      appVersion: process.env.npm_package_version ?? "0.1.0",
      serverTime: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      uptimePretty: formatDuration(process.uptime()),
      memory: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal
      },
      nodeVersion: process.version,
      lastReadinessCheck: databaseStatus
    }
  });
});

adminRouter.get("/system/backup-status", async (_req, res) => {
  const backupDir = path.isAbsolute(config.backup.localDir)
    ? config.backup.localDir
    : path.join(process.cwd(), config.backup.localDir);
  const warnings: string[] = [];
  let entries: Dirent[] = [];

  try {
    entries = await fs.readdir(backupDir, { withFileTypes: true });
  } catch {
    warnings.push(`Backup directory is not readable: ${config.backup.localDir}`);
  }

  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && /\.(zip|sql|dump|backup)$/i.test(entry.name))
      .map(async (entry) => {
        const absolutePath = path.join(backupDir, entry.name);
        const stat = await fs.stat(absolutePath);
        return {
          fileName: entry.name,
          sizeBytes: stat.size,
          createdAt: stat.birthtime.toISOString(),
          modifiedAt: stat.mtime.toISOString()
        };
      })
  );

  const sortedFiles = files.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  const latestBackup = sortedFiles[0] ?? null;
  const latestAgeHours = latestBackup
    ? Number(((Date.now() - new Date(latestBackup.modifiedAt).getTime()) / (60 * 60 * 1000)).toFixed(2))
    : null;
  const maxAgeHours = config.backup.maxAgeHours;

  if (!latestBackup) {
    warnings.push("No local database backup files were found");
  } else if (Number.isFinite(maxAgeHours) && maxAgeHours > 0 && latestAgeHours !== null && latestAgeHours > maxAgeHours) {
    warnings.push(`Latest backup is older than ${maxAgeHours} hours`);
  }

  if (config.nodeEnv === "production" && config.backup.localDir === "backups") {
    warnings.push("Production backups should also be copied outside the server");
  }

  return res.json({
    backup: {
      directory: config.backup.localDir,
      fileCount: sortedFiles.length,
      latestBackup,
      latestAgeHours,
      maxAgeHours,
      status: warnings.length === 0 ? "healthy" : latestBackup ? "warning" : "critical",
      recentFiles: sortedFiles.slice(0, 5)
    },
    warnings
  });
});

adminRouter.get("/applications", async (_req, res) => {
  const applications = await prisma.memberApplication.findMany({
    include: {
      approvedBy: { select: { id: true, name: true, phone: true, role: true } },
      approvedUser: { select: { id: true, name: true, phone: true, role: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ applications });
});

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const strongPassword = z.string()
  .min(8, "Password must be at least 8 characters long")
  .regex(passwordRegex, "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character");

const approveApplicationSchema = z.object({
  password: strongPassword,
  sponsorId: z.string().uuid().optional()
});


adminRouter.patch("/applications/:id/approve", async (req, res) => {
  const parsed = approveApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid approval details", details: parsed.error.flatten() });
  }

  const application = await prisma.memberApplication.findUnique({
    where: { id: String(req.params.id) }
  });

  if (!application) {
    return res.status(404).json({ error: "Application not found" });
  }

  if (application.status !== ApplicationStatus.PENDING) {
    return res.status(400).json({ error: "Only pending applications can be approved" });
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: application.phone },
        application.email ? { email: application.email } : { id: "__none__" }
      ]
    }
  });

  if (existingUser) {
    return res.status(409).json({ error: "A user already exists with this application phone or email" });
  }

  const sponsor = parsed.data.sponsorId
    ? await prisma.user.findUnique({ where: { id: parsed.data.sponsorId } })
    : application.sponsorPhone
      ? await prisma.user.findFirst({ where: { phone: application.sponsorPhone } })
      : null;

  if (application.requestedRole === Role.BETA_MANAGER) {
    if (!sponsor || sponsor.role !== Role.MANAGER) {
      return res.status(400).json({ error: "Beta Manager application requires a Manager sponsor" });
    }

    await assertCanCreateBetaManager(sponsor.id);
  } else if (application.requestedRole !== Role.MANAGER) {
    if (!sponsor) {
      return res.status(400).json({ error: "Sponsor is required before approving this application" });
    }

    await assertCanAddDownline({
      sponsorId: sponsor.id,
      newRole: application.requestedRole,
      placementType: sponsor.placementType
    });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const betaRootManagerId = application.requestedRole === Role.BETA_MANAGER ? sponsor?.id : undefined;
    const createdUser = await tx.user.create({
      data: {
        name: application.name,
        phone: application.phone,
        email: application.email,
        passwordHash,
        role: application.requestedRole,
        sponsorId: application.requestedRole === Role.MANAGER ? undefined : sponsor?.id,
        createdById: req.user!.id,
        placementType: application.requestedRole === Role.BETA_MANAGER ? PlacementType.BETA_MATRIX : sponsor?.placementType ?? PlacementType.NORMAL,
        normalManagerId:
          (sponsor?.placementType ?? PlacementType.NORMAL) === PlacementType.NORMAL
            ? application.requestedRole === Role.MANAGER || application.requestedRole === Role.BETA_MANAGER
              ? undefined
              : sponsor?.normalManagerId ?? sponsor?.id
            : undefined,
        betaRootManagerId:
          application.requestedRole === Role.BETA_MANAGER
            ? betaRootManagerId
            : sponsor?.placementType === PlacementType.BETA_MATRIX
            ? sponsor.betaRootManagerId ?? sponsor.id
            : undefined,
        referralCode: referralCodeFromPhone(application.phone)
      }
    });

    if (application.requestedRole === Role.BETA_MANAGER) {
      await tx.betaMatrix.create({
        data: {
          rootManagerId: betaRootManagerId!,
          betaManagerId: createdUser.id
        }
      });
    }

    await tx.memberApplication.update({
      where: { id: application.id },
      data: {
        status: ApplicationStatus.APPROVED,
        approvedById: req.user!.id,
        approvedUserId: createdUser.id,
        passwordIssued: true,
        decidedAt: new Date()
      }
    });

    return createdUser;
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: "MEMBER_APPLICATION_APPROVED",
    entityType: "MemberApplication",
    entityId: application.id,
    metadata: {
      createdUserId: user.id,
      requestedRole: application.requestedRole
    }
  });

  const emailResult = application.email
    ? await sendLoginCredentialsEmail({
        to: application.email,
        name: user.name,
        phone: user.phone,
        password: parsed.data.password,
        role: user.role
      })
    : { sent: false, reason: "Application email is missing" };

  return res.json({
    user,
    credentials: {
      phone: user.phone,
      password: parsed.data.password,
      emailReady: emailResult.sent,
      emailSent: emailResult.sent
    }
  });
});

const rejectApplicationSchema = z.object({
  reason: z.string().min(2)
});

const helpTopicSchema = z.object({
  title: z.string().min(2).max(120),
  shortDescription: z.string().min(2).max(240),
  content: z.string().min(2).max(4000),
  role: z.enum([
    HelpTopicRole.ALL,
    HelpTopicRole.ADMIN,
    HelpTopicRole.MANAGER,
    HelpTopicRole.BETA_MANAGER,
    HelpTopicRole.LEVEL_1,
    HelpTopicRole.LEVEL_2,
    HelpTopicRole.CUSTOMER
  ]),
  category: z.enum([
    HelpTopicCategory.MY_WORK,
    HelpTopicCategory.PRODUCTS,
    HelpTopicCategory.NETWORK,
    HelpTopicCategory.PAYMENTS,
    HelpTopicCategory.EARNINGS,
    HelpTopicCategory.ADMIN,
    HelpTopicCategory.SUPPORT,
    HelpTopicCategory.FAQ
  ]),
  steps: z.array(z.string().min(1).max(240)).max(12).default([]),
  relatedRoute: z.string().max(80).optional().nullable(),
  videoUrl: z.string().url().optional().or(z.literal("")).nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0)
});

adminRouter.get("/help-topics", async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const role = typeof req.query.role === "string" ? req.query.role : "ALL";
  const active = typeof req.query.active === "string" ? req.query.active : "ALL";

  const topics = await prisma.helpTopic.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { shortDescription: { contains: search, mode: "insensitive" } },
              { content: { contains: search, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(role !== "ALL" && Object.values(HelpTopicRole).includes(role as HelpTopicRole)
        ? { role: role as HelpTopicRole }
        : {}),
      ...(active === "ACTIVE" ? { isActive: true } : active === "INACTIVE" ? { isActive: false } : {})
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
  });

  return res.json({ topics });
});

adminRouter.post("/help-topics", async (req, res) => {
  const parsed = helpTopicSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid help topic", details: parsed.error.flatten() });
  }

  const topic = await prisma.helpTopic.create({
    data: {
      ...parsed.data,
      videoUrl: parsed.data.videoUrl || null,
      relatedRoute: parsed.data.relatedRoute || null,
      createdById: req.user!.id,
      updatedById: req.user!.id
    }
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: "HELP_TOPIC_CREATED",
    entityType: "HelpTopic",
    entityId: topic.id,
    metadata: { role: topic.role, category: topic.category }
  });

  return res.status(201).json({ topic });
});

adminRouter.put("/help-topics/:id", async (req, res) => {
  const parsed = helpTopicSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid help topic", details: parsed.error.flatten() });
  }

  const existing = await prisma.helpTopic.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) {
    return res.status(404).json({ error: "Help topic not found" });
  }

  const topic = await prisma.helpTopic.update({
    where: { id: existing.id },
    data: {
      ...parsed.data,
      videoUrl: parsed.data.videoUrl || null,
      relatedRoute: parsed.data.relatedRoute || null,
      updatedById: req.user!.id
    }
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: "HELP_TOPIC_UPDATED",
    entityType: "HelpTopic",
    entityId: topic.id,
    metadata: { role: topic.role, category: topic.category, isActive: topic.isActive }
  });

  return res.json({ topic });
});

adminRouter.patch("/help-topics/:id/status", async (req, res) => {
  const parsed = z.object({ isActive: z.boolean() }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid help topic status", details: parsed.error.flatten() });
  }

  const topic = await prisma.helpTopic.update({
    where: { id: String(req.params.id) },
    data: { isActive: parsed.data.isActive, updatedById: req.user!.id }
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: parsed.data.isActive ? "HELP_TOPIC_ACTIVATED" : "HELP_TOPIC_DEACTIVATED",
    entityType: "HelpTopic",
    entityId: topic.id,
    metadata: { isActive: topic.isActive }
  });

  return res.json({ topic });
});

adminRouter.delete("/help-topics/:id", async (req, res) => {
  const topic = await prisma.helpTopic.update({
    where: { id: String(req.params.id) },
    data: { isActive: false, updatedById: req.user!.id }
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: "HELP_TOPIC_DEACTIVATED",
    entityType: "HelpTopic",
    entityId: topic.id,
    metadata: { softDelete: true }
  });

  return res.json({ topic });
});

adminRouter.patch("/applications/:id/reject", async (req, res) => {
  const parsed = rejectApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid rejection details", details: parsed.error.flatten() });
  }

  const application = await prisma.memberApplication.findUnique({
    where: { id: String(req.params.id) }
  });

  if (!application) {
    return res.status(404).json({ error: "Application not found" });
  }

  if (application.status !== ApplicationStatus.PENDING) {
    return res.status(400).json({ error: "Only pending applications can be rejected" });
  }

  const updated = await prisma.memberApplication.update({
    where: { id: application.id },
    data: {
      status: ApplicationStatus.REJECTED,
      rejectionReason: parsed.data.reason,
      approvedById: req.user!.id,
      decidedAt: new Date()
    }
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: "MEMBER_APPLICATION_REJECTED",
    entityType: "MemberApplication",
    entityId: application.id,
    metadata: { reason: parsed.data.reason }
  });

  return res.json({ application: updated });
});

adminRouter.get("/users/:id", async (req, res) => {
  const userId = String(req.params.id);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      sponsor: {
        select: { id: true, name: true, phone: true, role: true, status: true, referralCode: true }
      },
      downline: {
        select: { id: true, name: true, phone: true, role: true, status: true, referralCode: true, sponsorId: true },
        orderBy: { createdAt: "desc" }
      },
      orders: {
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 20
      },
      collectedOrders: {
        include: {
          customer: {
            select: { id: true, name: true, phone: true, role: true }
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 20
      },
      commissions: {
        include: {
          sourceUser: {
            select: { id: true, name: true, phone: true, role: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 30
      },
      commissionSources: {
        include: {
          receiver: {
            select: { id: true, name: true, phone: true, role: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 30
      }
    }
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({ user });
});

adminRouter.patch("/users/:id/status", async (req, res) => {
  const parsed = z.object({ status: z.enum(UserStatus) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid user status", details: parsed.error.flatten() });
  }

  const target = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!target) {
    return res.status(404).json({ error: "User not found" });
  }
  if (target.role === Role.ADMIN) {
    return res.status(403).json({ error: "Admin account status cannot be changed from the app" });
  }

  const user = await prisma.user.update({
    where: { id: target.id },
    data: { status: parsed.data.status },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      referralCode: true
    }
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: "USER_STATUS_UPDATED",
    entityType: "User",
    entityId: user.id,
    metadata: { status: user.status }
  });

  return res.json({ user });
});

const resetUserPasswordSchema = z.object({
  password: strongPassword
});

adminRouter.patch("/users/:id/reset-password", async (req, res) => {
  const parsed = resetUserPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid password", details: parsed.error.flatten() });
  }

  const target = await prisma.user.findUnique({
    where: { id: String(req.params.id) },
    select: { id: true, phone: true, role: true }
  });

  if (!target) {
    return res.status(404).json({ error: "User not found" });
  }

  if (target.role === Role.ADMIN) {
    return res.status(403).json({ error: "Admin password must be changed from Security using current password" });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      status: true
    }
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: "USER_PASSWORD_RESET",
    entityType: "User",
    entityId: user.id,
    metadata: { role: user.role }
  });

  return res.json({
    user,
    credentials: {
      phone: user.phone,
      password: parsed.data.password,
      emailReady: false
    }
  });
});

adminRouter.patch("/commissions/:id/paid", async (req, res) => {
  const commission = await prisma.commissionLedger.update({
    where: { id: String(req.params.id) },
    data: {
      status: CommissionStatus.PAID,
      paidAt: new Date()
    },
    include: {
      receiver: { select: { id: true, name: true, phone: true, role: true } },
      sourceUser: { select: { id: true, name: true, phone: true, role: true } }
    }
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: "COMMISSION_MARKED_PAID",
    entityType: "CommissionLedger",
    entityId: commission.id,
    metadata: { amount: commission.amount, receiverId: commission.receiverId }
  });

  return res.json({ commission });
});

adminRouter.get("/audit-logs", async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    include: {
      actor: { select: { id: true, name: true, phone: true, role: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return res.json({ logs });
});

adminRouter.patch("/orders/:id/status", async (req, res) => {
  const parsed = z.object({
    status: z.enum(OrderStatus),
    paymentStatus: z.enum(PaymentStatus).optional()
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid order status", details: parsed.error.flatten() });
  }

  try {
    const orderId = String(req.params.id);
    const order = await prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!currentOrder) {
        throw new Error("Order not found");
      }

      if (currentOrder.status === OrderStatus.CANCELLED && parsed.data.status !== OrderStatus.CANCELLED) {
        throw new Error("Cancelled orders cannot be reopened");
      }

      if (parsed.data.status === OrderStatus.CANCELLED && currentOrder.status !== OrderStatus.CANCELLED) {
        for (const item of currentOrder.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: parsed.data,
        include: {
          customer: { select: { id: true, name: true, phone: true, role: true } },
          items: { include: { product: { select: { id: true, name: true } } } }
        }
      });
    });

    await writeAuditLog({
      actorId: req.user!.id,
      action: "ORDER_STATUS_UPDATED",
      entityType: "Order",
      entityId: order.id,
      metadata: {
        ...parsed.data,
        stockRestored: parsed.data.status === OrderStatus.CANCELLED
      }
    });

    return res.json({ order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update order status";
    return res.status(message === "Order not found" ? 404 : 400).json({ error: message });
  }
});

adminRouter.get("/payment-handovers", async (_req, res) => {
  const handovers = await prisma.paymentHandover.findMany({
    include: {
      fromUser: { select: { id: true, name: true, phone: true, role: true } },
      toUser: { select: { id: true, name: true, phone: true, role: true } },
      order: { select: { id: true, totalAmount: true, status: true, paymentStatus: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return res.json({ handovers: await attachPaymentProofFiles(handovers) });
});

adminRouter.patch("/payment-handovers/:id/status", async (req, res) => {
  const parsed = z.object({ status: z.enum(PaymentHandoverStatus) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid handover status", details: parsed.error.flatten() });
  }

  const handover = await prisma.paymentHandover.update({
    where: { id: String(req.params.id) },
    data: {
      status: parsed.data.status,
      receivedAt: parsed.data.status === PaymentHandoverStatus.RECEIVED ? new Date() : undefined
    }
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: "PAYMENT_HANDOVER_STATUS_UPDATED",
    entityType: "PaymentHandover",
    entityId: handover.id,
    metadata: { status: handover.status }
  });

  return res.json({ handover });
});

adminRouter.get("/stock-adjustments", async (_req, res) => {
  const adjustments = await prisma.productStockAdjustment.findMany({
    include: {
      product: { select: { id: true, name: true, category: true, stock: true } },
      actor: { select: { id: true, name: true, phone: true, role: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return res.json({ adjustments });
});

const stockAdjustmentSchema = z.object({
  type: z.enum(StockAdjustmentType),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().min(3)
});

adminRouter.post("/products/:id/stock-adjustments", async (req, res) => {
  const parsed = stockAdjustmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid stock adjustment", details: parsed.error.flatten() });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: String(req.params.id) } });
      if (!product) {
        throw new Error("Product not found");
      }

      const beforeStock = product.stock;
      const afterStock = parsed.data.type === StockAdjustmentType.REMOVE
        ? beforeStock - parsed.data.quantity
        : parsed.data.type === StockAdjustmentType.ADD
          ? beforeStock + parsed.data.quantity
          : parsed.data.quantity;

      if (afterStock < 0) {
        throw new Error("Stock cannot go below zero");
      }

      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: { stock: afterStock }
      });

      const adjustment = await tx.productStockAdjustment.create({
        data: {
          productId: product.id,
          actorId: req.user!.id,
          type: parsed.data.type,
          quantity: parsed.data.quantity,
          beforeStock,
          afterStock,
          reason: parsed.data.reason
        },
        include: {
          product: { select: { id: true, name: true, category: true, stock: true } },
          actor: { select: { id: true, name: true, phone: true, role: true } }
        }
      });

      return { product: updatedProduct, adjustment };
    });

    await writeAuditLog({
      actorId: req.user!.id,
      action: "PRODUCT_STOCK_ADJUSTED",
      entityType: "Product",
      entityId: result.product.id,
      metadata: {
        adjustmentId: result.adjustment.id,
        type: result.adjustment.type,
        quantity: result.adjustment.quantity,
        beforeStock: result.adjustment.beforeStock,
        afterStock: result.adjustment.afterStock
      }
    });

    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not adjust stock";
    return res.status(message === "Product not found" ? 404 : 400).json({ error: message });
  }
});

adminRouter.patch("/commissions/:id/status", async (req, res) => {
  const parsed = z.object({
    status: z.enum(CommissionStatus),
    notes: z.string().optional()
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid commission status", details: parsed.error.flatten() });
  }

  const commission = await prisma.commissionLedger.update({
    where: { id: String(req.params.id) },
    data: {
      status: parsed.data.status,
      notes: parsed.data.notes,
      paidAt: parsed.data.status === CommissionStatus.PAID ? new Date() : undefined
    }
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: "COMMISSION_STATUS_UPDATED",
    entityType: "CommissionLedger",
    entityId: commission.id,
    metadata: { status: commission.status, notes: parsed.data.notes }
  });

  return res.json({ commission });
});

adminRouter.post("/commissions/manual", async (req, res) => {
  const parsed = z.object({
    receiverId: z.string().uuid(),
    amount: z.coerce.number().positive(),
    notes: z.string().optional()
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid manual commission", details: parsed.error.flatten() });
  }

  const commission = await prisma.commissionLedger.create({
    data: {
      receiverId: parsed.data.receiverId,
      type: CommissionType.MANUAL_ADJUSTMENT,
      status: CommissionStatus.APPROVED,
      amount: parsed.data.amount,
      notes: parsed.data.notes
    }
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: "MANUAL_COMMISSION_CREATED",
    entityType: "CommissionLedger",
    entityId: commission.id,
    metadata: { receiverId: parsed.data.receiverId, amount: parsed.data.amount }
  });

  return res.status(201).json({ commission });
});

adminRouter.post("/products/:id/image", async (req, res) => {
  const parsed = z.object({
    fileName: z.string().min(3),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    base64: z.string().min(20)
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid image upload", details: parsed.error.flatten() });
  }

  const existingProduct = await prisma.product.findUnique({ where: { id: String(req.params.id) } });
  if (!existingProduct) {
    return res.status(404).json({ error: "Product not found" });
  }

  const imageBuffer = Buffer.from(parsed.data.base64, "base64");
  const maxSizeBytes = 3 * 1024 * 1024;
  if (imageBuffer.length > maxSizeBytes) {
    return res.status(400).json({ error: "Product image must be under 3 MB" });
  }

  const fileAsset = await uploadFile({
    buffer: imageBuffer,
    originalName: parsed.data.fileName,
    mimeType: parsed.data.mimeType,
    category: FileAssetCategory.PRODUCT_IMAGE,
    isPrivate: false,
    uploadedById: req.user!.id,
    relatedEntityType: "Product",
    relatedEntityId: existingProduct.id
  });

  if (!fileAsset.publicUrl) {
    return res.status(500).json({ error: "Product image URL was not created" });
  }

  const product = await prisma.product.update({
    where: { id: existingProduct.id },
    data: { imageUrl: fileAsset.publicUrl }
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: "PRODUCT_IMAGE_UPLOADED",
    entityType: "Product",
    entityId: product.id,
    metadata: { imageUrl: fileAsset.publicUrl, fileAssetId: fileAsset.id }
  });

  return res.json({ product, imageUrl: fileAsset.publicUrl, fileAsset });
});

adminRouter.get("/files/:fileId/view-url", async (req, res) => {
  const signedFile = await getSignedViewUrl(String(req.params.fileId));
  if (!signedFile) {
    return res.status(404).json({ error: "File not found" });
  }

  await writeAuditLog({
    actorId: req.user!.id,
    action: "VIEW_FILE_SIGNED_URL",
    entityType: "FileAsset",
    entityId: signedFile.file.id,
    metadata: { category: signedFile.file.category, isPrivate: signedFile.file.isPrivate }
  });

  return res.json({
    file: {
      id: signedFile.file.id,
      originalName: signedFile.file.originalName,
      mimeType: signedFile.file.mimeType,
      category: signedFile.file.category,
      isPrivate: signedFile.file.isPrivate
    },
    url: signedFile.url,
    expiresAt: signedFile.expiresAt
  });
});

adminRouter.get("/upgrade-requests", async (_req, res) => {
  const requests = await prisma.roleUpgradeRequest.findMany({
    include: {
      requester: { select: { id: true, name: true, phone: true, role: true, status: true } },
      approvedBy: { select: { id: true, name: true, phone: true, role: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ requests });
});

adminRouter.post("/upgrade-requests", async (req, res) => {
  const parsed = z.object({
    requesterId: z.string().uuid(),
    toRole: z.enum(Role),
    targetSponsorId: z.string().uuid().optional(),
    reason: z.string().optional()
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid upgrade request", details: parsed.error.flatten() });
  }

  const requester = await prisma.user.findUnique({ where: { id: parsed.data.requesterId } });
  if (!requester) {
    return res.status(404).json({ error: "User not found" });
  }
  if (parsed.data.toRole === Role.ADMIN) {
    return res.status(403).json({ error: "Upgrade to Admin is not allowed" });
  }

  const request = await prisma.roleUpgradeRequest.create({
    data: {
      requesterId: requester.id,
      fromRole: requester.role,
      toRole: parsed.data.toRole,
      targetSponsorId: parsed.data.targetSponsorId,
      reason: parsed.data.reason
    }
  });

  return res.status(201).json({ request });
});

adminRouter.patch("/upgrade-requests/:id/decision", async (req, res) => {
  const parsed = z.object({
    decision: z.enum(["APPROVED", "REJECTED", "CANCELLED"])
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid decision", details: parsed.error.flatten() });
  }

  const request = await prisma.roleUpgradeRequest.findUnique({ where: { id: String(req.params.id) } });
  if (!request) {
    return res.status(404).json({ error: "Upgrade request not found" });
  }
  if (request.status !== UpgradeStatus.PENDING) {
    return res.status(400).json({ error: "Request is already decided" });
  }

  if (parsed.data.decision === "APPROVED") {
    if (request.toRole !== Role.MANAGER && !request.targetSponsorId) {
      return res.status(400).json({ error: "targetSponsorId is required for this upgrade" });
    }
    if (request.toRole !== Role.MANAGER) {
      const sponsor = await prisma.user.findUnique({ where: { id: request.targetSponsorId! } });
      if (!sponsor) {
        return res.status(400).json({ error: "Target sponsor not found" });
      }
      await assertCanAddDownline({
        sponsorId: sponsor.id,
        newRole: request.toRole,
        placementType: sponsor.placementType
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: request.requesterId },
        data: {
          role: request.toRole,
          sponsorId: request.toRole === Role.MANAGER ? null : request.targetSponsorId,
          ...(request.aadhaarNumber ? { aadhaarNumber: request.aadhaarNumber } : {}),
          ...(request.panNumber ? { panNumber: request.panNumber } : {})
        }
      });
      await tx.roleUpgradeRequest.update({
        where: { id: request.id },
        data: {
          status: UpgradeStatus.APPROVED,
          approvedById: req.user!.id,
          decidedAt: new Date()
        }
      });
    });
  } else {
    await prisma.roleUpgradeRequest.update({
      where: { id: request.id },
      data: {
        status: parsed.data.decision as UpgradeStatus,
        approvedById: req.user!.id,
        decidedAt: new Date()
      }
    });
  }

  await writeAuditLog({
    actorId: req.user!.id,
    action: "ROLE_UPGRADE_DECIDED",
    entityType: "RoleUpgradeRequest",
    entityId: request.id,
    metadata: { decision: parsed.data.decision }
  });

  return res.json({ ok: true });
});

adminRouter.get("/reassignment-requests", async (_req, res) => {
  const requests = await prisma.reassignmentRequest.findMany({
    include: {
      subjectUser: { select: { id: true, name: true, phone: true, role: true, status: true } },
      approvedBy: { select: { id: true, name: true, phone: true, role: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ requests });
});

adminRouter.post("/reassignment-requests", async (req, res) => {
  const parsed = z.object({
    subjectUserId: z.string().uuid(),
    toSponsorId: z.string().uuid(),
    reason: z.string().optional()
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid reassignment request", details: parsed.error.flatten() });
  }

  const subject = await prisma.user.findUnique({ where: { id: parsed.data.subjectUserId } });
  if (!subject || subject.role === Role.ADMIN || subject.role === Role.MANAGER || subject.role === Role.BETA_MANAGER) {
    return res.status(400).json({ error: "Only Level 1, Level 2, or Customer can be reassigned" });
  }

  const sponsor = await prisma.user.findUnique({ where: { id: parsed.data.toSponsorId } });
  if (!sponsor) {
    return res.status(400).json({ error: "Target sponsor not found" });
  }

  await assertCanAddDownline({
    sponsorId: sponsor.id,
    newRole: subject.role,
    placementType: sponsor.placementType
  });

  const request = await prisma.reassignmentRequest.create({
    data: {
      subjectUserId: subject.id,
      fromSponsorId: subject.sponsorId,
      toSponsorId: sponsor.id,
      reason: parsed.data.reason
    }
  });

  return res.status(201).json({ request });
});

adminRouter.patch("/reassignment-requests/:id/decision", async (req, res) => {
  const parsed = z.object({
    decision: z.enum(["APPROVED", "REJECTED", "CANCELLED"])
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid decision", details: parsed.error.flatten() });
  }

  const request = await prisma.reassignmentRequest.findUnique({
    where: { id: String(req.params.id) },
    include: { subjectUser: true }
  });
  if (!request) {
    return res.status(404).json({ error: "Reassignment request not found" });
  }
  if (request.status !== ReassignmentStatus.PENDING) {
    return res.status(400).json({ error: "Request is already decided" });
  }

  if (parsed.data.decision === "APPROVED") {
    const sponsor = await prisma.user.findUnique({ where: { id: request.toSponsorId } });
    if (!sponsor) {
      return res.status(400).json({ error: "Target sponsor not found" });
    }
    await assertCanAddDownline({
      sponsorId: sponsor.id,
      newRole: request.subjectUser.role,
      placementType: sponsor.placementType
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: request.subjectUserId },
        data: {
          sponsorId: sponsor.id,
          placementType: sponsor.placementType,
          betaRootManagerId: sponsor.placementType === "BETA_MATRIX" ? sponsor.betaRootManagerId ?? sponsor.id : null,
          normalManagerId: sponsor.placementType === "NORMAL" ? sponsor.normalManagerId ?? sponsor.id : null
        }
      });
      await tx.reassignmentRequest.update({
        where: { id: request.id },
        data: {
          status: ReassignmentStatus.APPROVED,
          approvedById: req.user!.id,
          decidedAt: new Date()
        }
      });
    });
  } else {
    await prisma.reassignmentRequest.update({
      where: { id: request.id },
      data: {
        status: parsed.data.decision as ReassignmentStatus,
        approvedById: req.user!.id,
        decidedAt: new Date()
      }
    });
  }

  await writeAuditLog({
    actorId: req.user!.id,
    action: "REASSIGNMENT_DECIDED",
    entityType: "ReassignmentRequest",
    entityId: request.id,
    metadata: { decision: parsed.data.decision }
  });

  return res.json({ ok: true });
});
