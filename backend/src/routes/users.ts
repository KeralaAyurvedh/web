import { Router } from "express";
import bcrypt from "bcryptjs";
import { CommissionStatus, PaymentHandoverStatus, PaymentStatus, PlacementType, Role } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireRoles } from "../middlewares/auth";
import { assertCanAddDownline, assertCanCreateBetaManager, getBetaManagerEligibility } from "../services/networkRules";
import { createCommissionsAfterPaymentConfirmation } from "../services/commissionRules";
import { prisma } from "../utils/prisma";
import { writeAuditLog } from "../utils/audit";
import { sendLoginCredentialsEmail } from "../utils/email";

export const usersRouter = Router();

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const strongPassword = z.string()
  .min(8, "Password must be at least 8 characters long")
  .regex(passwordRegex, "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character");

const createUserSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  password: strongPassword,
  role: z.enum(Role),
  sponsorId: z.string().uuid().optional(),
  placementType: z.enum(PlacementType).default(PlacementType.NORMAL)
});

function positiveIntQuery(value: unknown, fallback: number, max: number) {
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), max);
}

function referralCodeFromPhone(phone: string) {
  const tail = phone.replace(/\D/g, "").slice(-6).padStart(6, "0");
  return `KA${tail}${Math.floor(Math.random() * 900 + 100)}`;
}

usersRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid user details", details: parsed.error.flatten() });
  }

  const actor = req.user!;
  const input = parsed.data;

  if (actor.role !== Role.ADMIN) {
    return res.status(403).json({ error: "Only Admin can create active users directly. Submit a member application for approval." });
  }

  let sponsor = input.sponsorId
    ? await prisma.user.findUnique({ where: { id: input.sponsorId } })
    : undefined;

  if (input.role === Role.ADMIN) {
    return res.status(403).json({ error: "Creating another Admin is not allowed from the app" });
  }

  if (input.role === Role.MANAGER) {
    if (actor.role !== Role.ADMIN) {
      return res.status(403).json({ error: "Only Admin can create Managers" });
    }
  } else if (input.role === Role.BETA_MANAGER) {
    const rootManagerId = actor.role === Role.ADMIN ? input.sponsorId : actor.id;

    if (!rootManagerId) {
      return res.status(400).json({ error: "Manager sponsor is required for Beta Manager" });
    }

    if (actor.role !== Role.ADMIN && actor.role !== Role.MANAGER) {
      return res.status(403).json({ error: "Only Admin or Manager can create a Beta Manager" });
    }

    if (actor.role === Role.ADMIN) {
      if (!sponsor) {
        return res.status(400).json({ error: "Sponsor Manager not found" });
      }

      if (sponsor.role !== Role.MANAGER) {
        return res.status(400).json({ error: "Beta Manager sponsor must be a Manager" });
      }
    }

    await assertCanCreateBetaManager(rootManagerId);
  } else {
    if (!input.sponsorId) {
      return res.status(400).json({ error: "sponsorId is required for this role" });
    }

    if (!sponsor) {
      return res.status(400).json({ error: "Sponsor not found" });
    }

    if (actor.role !== Role.ADMIN && actor.id !== sponsor.id) {
      return res.status(403).json({ error: "You can only add users directly under your own account" });
    }

    await assertCanAddDownline({
      sponsorId: input.sponsorId,
      newRole: input.role,
      placementType: sponsor.placementType
    });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const created = await prisma.$transaction(async (tx) => {
    if (input.sponsorId) {
      sponsor = await tx.user.findUnique({ where: { id: input.sponsorId } }) ?? undefined;
    }

    const betaRootManagerSponsorId = input.role === Role.BETA_MANAGER
      ? actor.role === Role.ADMIN
        ? input.sponsorId
        : actor.id
      : undefined;

    const betaRootManagerId =
      input.role === Role.BETA_MANAGER
        ? betaRootManagerSponsorId
        : sponsor?.placementType === PlacementType.BETA_MATRIX
          ? sponsor?.betaRootManagerId ?? sponsor?.id
          : undefined;

    const normalManagerId =
      (sponsor?.placementType ?? PlacementType.NORMAL) === PlacementType.NORMAL
        ? input.role === Role.MANAGER
          ? undefined
          : sponsor?.normalManagerId ?? sponsor?.id
        : undefined;

    const user = await tx.user.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        passwordHash,
        role: input.role,
        sponsorId: input.role === Role.MANAGER ? undefined : input.role === Role.BETA_MANAGER ? betaRootManagerSponsorId : input.sponsorId,
        createdById: actor.id,
        placementType: input.role === Role.BETA_MANAGER ? PlacementType.BETA_MATRIX : sponsor?.placementType ?? PlacementType.NORMAL,
        normalManagerId,
        betaRootManagerId,
        referralCode: referralCodeFromPhone(input.phone)
      }
    });

    if (input.role === Role.BETA_MANAGER) {
      await tx.betaMatrix.create({
        data: {
          rootManagerId: betaRootManagerSponsorId!,
          betaManagerId: user.id
        }
      });
    }

    return user;
  });

  await writeAuditLog({
    actorId: actor.id,
    action: "USER_CREATED",
    entityType: "User",
    entityId: created.id,
    metadata: {
      role: created.role,
      sponsorId: created.sponsorId,
      placementType: created.placementType
    }
  });

  const emailResult = created.email
    ? await sendLoginCredentialsEmail({
        to: created.email,
        name: created.name,
        phone: created.phone,
        password: input.password,
        role: created.role
      })
    : { sent: false, reason: "User email is missing" };

  return res.status(201).json({
    user: {
      id: created.id,
      name: created.name,
      phone: created.phone,
      role: created.role,
      status: created.status,
      referralCode: created.referralCode
    },
    emailSent: emailResult.sent,
    emailReason: emailResult.sent ? undefined : emailResult.reason
  });
});

usersRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      profileUnlocked: true,
      referralCode: true
    }
  });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.json({ user });
});

usersRouter.get("/me/network", requireAuth, async (req, res) => {
  if (req.user!.role === Role.CUSTOMER) {
    return res.status(403).json({ error: "Permission denied" });
  }
  const userId = req.user!.id;
  const limit = positiveIntQuery(req.query.limit, 100, 500);
  const page = positiveIntQuery(req.query.page, 1, 10_000);
  const skip = (page - 1) * limit;

  const [downline, total] = await Promise.all([
    prisma.user.findMany({
      where: { sponsorId: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        placementType: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.user.count({ where: { sponsorId: userId } })
  ]);

  return res.json({
    downline,
    pagination: {
      page,
      limit,
      total,
      hasMore: skip + downline.length < total
    }
  });
});

usersRouter.get("/options", requireAuth, async (req, res) => {
  if (req.user!.role === Role.CUSTOMER) {
    return res.status(403).json({ error: "Permission denied" });
  }
  const user = await prisma.user.findUnique({

    where: { id: req.user!.id },
    select: {
      id: true,
      sponsorId: true,
      role: true
    }
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const users = await prisma.user.findMany({
    where: user.role === Role.ADMIN
      ? { status: "ACTIVE" }
      : {
          status: "ACTIVE",
          OR: [
            { id: user.id },
            { sponsorId: user.id }
          ]
        },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      referralCode: true
    },
    orderBy: [
      { role: "asc" },
      { createdAt: "desc" }
    ]
  });

  const usersWithEligibility = await Promise.all(
    users.map(async (option) => {
      if (option.role !== Role.MANAGER) {
        return option;
      }

      return {
        ...option,
        betaManagerEligibility: await getBetaManagerEligibility(option.id)
      };
    })
  );

  return res.json({ users: usersWithEligibility });
});

usersRouter.get("/me/dashboard", requireAuth, async (req, res) => {
  const actor = req.user!;

  const [
    directDownline,
    activeDirectDownline,
    customerDownline,
    orders,
    pendingOrders,
    handovers,
    pendingHandovers,
    commissions,
    pendingCommissions,
    approvedCommissions,
    matrix
  ] = await Promise.all([
    prisma.user.count({ where: { sponsorId: actor.id } }),
    prisma.user.count({ where: { sponsorId: actor.id, status: "ACTIVE" } }),
    prisma.user.count({ where: { sponsorId: actor.id, role: Role.CUSTOMER } }),
    prisma.order.count({
      where: {
        OR: [
          { customerId: actor.id },
          { collectedById: actor.id }
        ]
      }
    }),
    prisma.order.count({
      where: {
        paymentStatus: PaymentStatus.PENDING,
        OR: [
          { customerId: actor.id },
          { collectedById: actor.id }
        ]
      }
    }),
    prisma.paymentHandover.count({
      where: {
        OR: [
          { fromUserId: actor.id },
          { toUserId: actor.id }
        ]
      }
    }),
    prisma.paymentHandover.count({
      where: {
        status: { in: [PaymentHandoverStatus.PENDING, PaymentHandoverStatus.HANDED_OVER] },
        OR: [
          { fromUserId: actor.id },
          { toUserId: actor.id }
        ]
      }
    }),
    prisma.commissionLedger.aggregate({
      where: { receiverId: actor.id },
      _count: { id: true },
      _sum: { amount: true }
    }),
    prisma.commissionLedger.aggregate({
      where: { receiverId: actor.id, status: CommissionStatus.PENDING },
      _sum: { amount: true }
    }),
    prisma.commissionLedger.aggregate({
      where: { receiverId: actor.id, status: CommissionStatus.APPROVED },
      _sum: { amount: true }
    }),
    actor.role === Role.MANAGER
      ? prisma.betaMatrix.findUnique({ where: { rootManagerId: actor.id } })
      : actor.role === Role.BETA_MANAGER
        ? prisma.betaMatrix.findUnique({ where: { betaManagerId: actor.id } })
        : Promise.resolve(null)
  ]);

  return res.json({
    dashboard: {
      role: actor.role,
      directDownline,
      activeDirectDownline,
      customerDownline,
      orders,
      pendingOrders,
      handovers,
      pendingHandovers,
      commissionCount: commissions._count.id,
      commissionTotal: commissions._sum.amount ?? 0,
      pendingCommissionTotal: pendingCommissions._sum.amount ?? 0,
      approvedCommissionTotal: approvedCommissions._sum.amount ?? 0,
      matrix: matrix
        ? {
            status: matrix.status,
            confirmedCustomers: matrix.confirmedCustomers,
            requiredCustomers: matrix.requiredCustomers,
            pendingAmount: matrix.pendingAmount,
            completionAmount: matrix.completionAmount
          }
        : null
    }
  });
});

usersRouter.get("/tree", requireAuth, async (req, res) => {
  if (req.user!.role === Role.CUSTOMER) {
    return res.status(403).json({ error: "Permission denied" });
  }
  const actor = req.user!;
  const limit = positiveIntQuery(req.query.limit, 1000, 5000);

  const users = await prisma.user.findMany({
    where: actor.role === Role.ADMIN ? {} : { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      referralCode: true,
      sponsorId: true,
      placementType: true,
      companyPaymentConfirmedAt: true,
      commissionProcessedAt: true
    },
    orderBy: [
      { role: "asc" },
      { createdAt: "asc" }
    ],
    take: limit
  });

  if (actor.role === Role.ADMIN) {
    return res.json({
      root: {
        id: "COMPANY",
        name: "Kerala Ayurvedh",
        role: "COMPANY",
        status: "ACTIVE"
      },
      users,
      meta: {
        limit,
        returned: users.length,
        truncated: users.length === limit
      }
    });
  }

  const allowedIds = new Set<string>([actor.id]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const user of users) {
      if (user.sponsorId && allowedIds.has(user.sponsorId) && !allowedIds.has(user.id)) {
        allowedIds.add(user.id);
        changed = true;
      }
    }
  }

  const visibleUsers = users.filter((user) => allowedIds.has(user.id));
  const rootUser = visibleUsers.find((user) => user.id === actor.id);

  return res.json({
    root: rootUser ? { ...rootUser, sponsorId: null } : undefined,
    users: visibleUsers.map((user) => user.id === actor.id ? { ...user, sponsorId: null } : user),
    meta: {
      limit,
      returned: visibleUsers.length,
      truncated: users.length === limit
    }
  });
});

usersRouter.post("/:id/confirm-company-payment", requireAuth, requireRoles(Role.ADMIN), async (req, res) => {
  const userId = String(req.params.id);

  const user = await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: userId }
    });

    if (!target) {
      throw new Error("User not found");
    }

    if (target.role === Role.ADMIN || target.role === Role.MANAGER) {
      throw new Error("This role does not generate joining commission");
    }

    await createCommissionsAfterPaymentConfirmation(tx, target.id);

    return tx.user.findUniqueOrThrow({
      where: { id: target.id },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        companyPaymentConfirmedAt: true,
        commissionProcessedAt: true
      }
    });
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: "USER_COMPANY_PAYMENT_CONFIRMED",
    entityType: "User",
    entityId: user.id,
    metadata: {
      role: user.role
    }
  });

  return res.json({ user });
});

usersRouter.get("/", requireAuth, requireRoles(Role.ADMIN), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      status: true,
      placementType: true,
      sponsorId: true,
      profileUnlocked: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ users });
});

usersRouter.post("/me/upgrade-request", requireAuth, async (req, res) => {
  const actor = req.user!;

  if (actor.role !== Role.CUSTOMER) {
    return res.status(403).json({ error: "Only Customers can request an upgrade via this interface." });
  }

  const parsed = z.object({
    toRole: z.enum([Role.LEVEL_1, Role.LEVEL_2]),
    reason: z.string().min(2, "Please provide a reason or message for your upgrade request."),
    aadhaarNumber: z.string().regex(/^\d{12}$/, "A valid 12-digit Aadhaar number is required."),
    panNumber: z.preprocess(
      (value) => typeof value === "string" ? value.trim().toUpperCase() : value,
      z.string().optional()
    ).optional(),
    privacyConsentAccepted: z.literal(true, {
      error: "Privacy consent is required before submitting Aadhaar/PAN details"
    })
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid upgrade request details", details: parsed.error.flatten() });
  }

  const existingPending = await prisma.roleUpgradeRequest.findFirst({
    where: {
      requesterId: actor.id,
      status: "PENDING"
    }
  });

  if (existingPending) {
    return res.status(400).json({ error: "You already have a pending upgrade request." });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: actor.id }
  });

  if (!dbUser) {
    return res.status(404).json({ error: "User not found" });
  }

  const request = await prisma.roleUpgradeRequest.create({
    data: {
      requesterId: actor.id,
      fromRole: actor.role,
      toRole: parsed.data.toRole,
      targetSponsorId: dbUser.sponsorId,
      reason: parsed.data.reason,
      aadhaarNumber: parsed.data.aadhaarNumber,
      panNumber: parsed.data.panNumber,
      privacyConsentAcceptedAt: new Date()
    }
  });

  await writeAuditLog({
    actorId: actor.id,
    action: "ROLE_UPGRADE_REQUESTED_BY_USER",
    entityType: "RoleUpgradeRequest",
    entityId: request.id,
    metadata: {
      fromRole: actor.role,
      toRole: parsed.data.toRole
    }
  });

  return res.status(201).json({ request });
});

usersRouter.get("/me/upgrade-request", requireAuth, async (req, res) => {
  const actor = req.user!;
  const request = await prisma.roleUpgradeRequest.findFirst({
    where: { requesterId: actor.id },
    orderBy: { createdAt: "desc" }
  });
  return res.json({ request });
});
