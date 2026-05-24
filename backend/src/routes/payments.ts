import { Router } from "express";
import { FileAssetCategory, PaymentHandoverStatus, Role } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { prisma } from "../utils/prisma";
import { writeAuditLog } from "../utils/audit";
import { uploadFile } from "../services/storage";

export const paymentsRouter = Router();

async function proofFilesForHandovers<T extends { id: string; proofUrl?: string | null }>(handovers: T[]) {
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

const createHandoverSchema = z.object({
  orderId: z.string().uuid().optional(),
  toUserId: z.string().uuid().optional(),
  amount: z.coerce.number().positive(),
  proofUrl: z.string().url().optional(),
  notes: z.string().optional()
});

paymentsRouter.post("/handovers", requireAuth, async (req, res) => {
  const parsed = createHandoverSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid handover details", details: parsed.error.flatten() });
  }

  const fromUserId = req.user!.id;
  const actor = await prisma.user.findUnique({
    where: { id: fromUserId },
    select: { id: true, role: true, sponsorId: true }
  });

  if (!actor) {
    return res.status(404).json({ error: "Sender not found" });
  }

  let receiverId = parsed.data.toUserId;
  if (actor.role !== Role.ADMIN) {
    if (parsed.data.toUserId && parsed.data.toUserId !== actor.sponsorId) {
      return res.status(403).json({ error: "Receiver is selected automatically for non-admin users" });
    }
    receiverId = actor.sponsorId ?? undefined;
  }

  if (!receiverId) {
    const companyAdmin = await prisma.user.findFirst({
      where: { role: Role.ADMIN, status: "ACTIVE" },
      select: { id: true }
    });
    receiverId = companyAdmin?.id;
  }

  if (!receiverId) {
    return res.status(400).json({ error: "No receiver available for this payment handover" });
  }

  if (parsed.data.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
      select: { id: true, customerId: true, collectedById: true }
    });

    if (!order) {
      return res.status(400).json({ error: "Order not found" });
    }

    if (actor.role !== Role.ADMIN && order.customerId !== actor.id && order.collectedById !== actor.id) {
      return res.status(403).json({ error: "You cannot record a handover for this order" });
    }
  }

  const toUser = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!toUser) {
    return res.status(400).json({ error: "Receiver not found" });
  }

  const handover = await prisma.paymentHandover.create({
    data: {
      orderId: parsed.data.orderId,
      fromUserId,
      toUserId: toUser.id,
      amount: parsed.data.amount,
      proofUrl: parsed.data.proofUrl,
      notes: parsed.data.notes,
      status: PaymentHandoverStatus.HANDED_OVER,
      handedOverAt: new Date()
    }
  });

  await writeAuditLog({
    actorId: fromUserId,
    action: "PAYMENT_HANDED_OVER",
    entityType: "PaymentHandover",
    entityId: handover.id,
    metadata: {
      orderId: handover.orderId,
      toUserId: toUser.id,
      amount: parsed.data.amount
    }
  });

  return res.status(201).json({ handover });
});

paymentsRouter.post("/handovers/:id/proof", requireAuth, async (req, res) => {
  const parsed = z.object({
    fileName: z.string().min(3),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
    base64: z.string().min(20)
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payment proof", details: parsed.error.flatten() });
  }

  const handover = await prisma.paymentHandover.findUnique({ where: { id: String(req.params.id) } });
  if (!handover) {
    return res.status(404).json({ error: "Handover not found" });
  }

  if (
    req.user!.role !== Role.ADMIN
    && handover.fromUserId !== req.user!.id
    && handover.toUserId !== req.user!.id
  ) {
    return res.status(403).json({ error: "You cannot upload proof for this handover" });
  }

  const proofBuffer = Buffer.from(parsed.data.base64, "base64");
  const maxSizeBytes = 2 * 1024 * 1024;
  if (proofBuffer.length > maxSizeBytes) {
    return res.status(400).json({ error: "Payment proof must be under 2 MB" });
  }

  const fileAsset = await uploadFile({
    buffer: proofBuffer,
    originalName: parsed.data.fileName,
    mimeType: parsed.data.mimeType,
    category: FileAssetCategory.PAYMENT_PROOF,
    isPrivate: true,
    uploadedById: req.user!.id,
    relatedEntityType: "PaymentHandover",
    relatedEntityId: handover.id
  });

  const updated = await prisma.paymentHandover.update({
    where: { id: handover.id },
    data: { proofUrl: fileAsset.id }
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: "PAYMENT_PROOF_UPLOADED",
    entityType: "PaymentHandover",
    entityId: handover.id,
    metadata: { fileAssetId: fileAsset.id, mimeType: fileAsset.mimeType, sizeBytes: fileAsset.sizeBytes }
  });

  return res.json({
    handover: updated,
    file: {
      id: fileAsset.id,
      originalName: fileAsset.originalName,
      mimeType: fileAsset.mimeType,
      sizeBytes: fileAsset.sizeBytes,
      isPrivate: fileAsset.isPrivate
    }
  });
});

paymentsRouter.post("/handovers/:id/receive", requireAuth, async (req, res) => {
  const handoverId = String(req.params.id);
  const handover = await prisma.paymentHandover.findUnique({
    where: { id: handoverId }
  });

  if (!handover) {
    return res.status(404).json({ error: "Handover not found" });
  }

  if (req.user!.role !== Role.ADMIN && handover.toUserId !== req.user!.id) {
    return res.status(403).json({ error: "Only the receiver or Admin can confirm this handover" });
  }

  const updated = await prisma.paymentHandover.update({
    where: { id: handover.id },
    data: {
      status: PaymentHandoverStatus.RECEIVED,
      receivedAt: new Date()
    }
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: "PAYMENT_HANDOVER_RECEIVED",
    entityType: "PaymentHandover",
    entityId: updated.id
  });

  return res.json({ handover: updated });
});

paymentsRouter.get("/handovers/me", requireAuth, async (req, res) => {
  const actor = req.user!;
  const actorUser = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { sponsorId: true }
  });
  const handovers = await prisma.paymentHandover.findMany({
    where: {
      OR: [
        { fromUserId: actor.id },
        { toUserId: actor.id }
      ]
    },
    include: {
      fromUser: { select: { id: true, name: true, phone: true, role: true } },
      toUser: { select: { id: true, name: true, phone: true, role: true } },
      order: { select: { id: true, totalAmount: true, status: true, paymentStatus: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const handoversWithProof = await proofFilesForHandovers(handovers);
  if (actor.role === Role.ADMIN) {
    return res.json({ handovers: handoversWithProof });
  }

  return res.json({
    handovers: handoversWithProof.map((handover) => ({
      ...handover,
      fromUser: handover.fromUserId === actorUser?.sponsorId ? null : handover.fromUser,
      toUser: handover.toUserId === actor.id ? handover.toUser : null
    }))
  });
});
