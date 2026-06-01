import { Router } from "express";
import bcrypt from "bcryptjs";
import { Role, PlacementType, FileAssetCategory } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireRoles } from "../middlewares/auth";
import { prisma } from "../utils/prisma";
import { config } from "../utils/config";
import { writeAuditLog } from "../utils/audit";
import { sendLoginCredentialsEmail } from "../utils/email";
import { uploadFile } from "../services/storage";
import { assertCanAddDownline, assertCanCreateBetaManager } from "../services/networkRules";

export const paymentVerificationsRouter = Router();

// Zod schemas for input validation
const submitPaymentSchema = z.object({
  applicantData: z.object({
    name: z.string().min(2),
    phone: z.string().min(6),
    email: z.string().email("A valid email is required").optional().nullable(),
    sponsorReferralCode: z.string().optional().nullable(),
    sponsorPhone: z.string().optional().nullable(),
    aadhaarNumber: z.string().optional().nullable(),
    panNumber: z.string().optional().nullable(),
    privacyConsentAccepted: z.boolean().optional(),
    password: z.string().optional().nullable()
  }),
  role: z.enum([Role.MANAGER, Role.BETA_MANAGER, Role.LEVEL_1, Role.LEVEL_2, Role.CUSTOMER]),
  transactionId: z.string().optional().nullable(),
  screenshot: z.object({
    fileName: z.string(),
    mimeType: z.string(),
    base64: z.string()
  }).optional().nullable(),
  addedByUserId: z.string().uuid().optional().nullable()
});

const rejectPaymentSchema = z.object({
  reason: z.string().min(2)
});

function referralCodeFromPhone(phone: string) {
  const tail = phone.replace(/\D/g, "").slice(-6).padStart(6, "0");
  return `KA${tail}${Math.floor(Math.random() * 900 + 100)}`;
}

// 1. Submit Payment Verification Request
paymentVerificationsRouter.post("/submit", async (req, res) => {
  const parsed = submitPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payment submission details", details: parsed.error.flatten() });
  }

  const { applicantData, role, transactionId, screenshot, addedByUserId } = parsed.data;
  const phone = applicantData.phone;

  // 1. Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { phone }
  });
  if (existingUser) {
    return res.status(409).json({ error: "A user already exists with this phone number." });
  }

  // 2. Check for duplicate pending payment submissions for same phone
  const pendingPayments = await prisma.paymentVerification.findMany({
    where: { status: "PENDING_VERIFICATION" }
  });
  const duplicate = pendingPayments.find((p) => {
    const data = p.applicantData as any;
    return data && data.phone === phone;
  });
  if (duplicate) {
    return res.status(409).json({ error: "A registration payment is already pending verification for this phone number." });
  }

  let screenshotUrl: string | null = null;
  if (screenshot) {
    try {
      const screenshotBuffer = Buffer.from(screenshot.base64, "base64");
      const maxSizeBytes = 5 * 1024 * 1024; // Max 5MB
      if (screenshotBuffer.length > maxSizeBytes) {
        return res.status(400).json({ error: "Screenshot image must be under 5 MB" });
      }

      const fileAsset = await uploadFile({
        buffer: screenshotBuffer,
        originalName: screenshot.fileName,
        mimeType: screenshot.mimeType,
        category: FileAssetCategory.PAYMENT_PROOF,
        isPrivate: true,
        uploadedById: addedByUserId || undefined
      });

      screenshotUrl = `/files/${fileAsset.id}/raw`;
    } catch (uploadErr) {
      console.error("Screenshot upload failed:", uploadErr);
      return res.status(500).json({ error: "Could not save screenshot. Please try again." });
    }
  }

  try {
    const verification = await prisma.paymentVerification.create({
      data: {
        applicantData: applicantData as any,
        addedByUserId: addedByUserId || null,
        roleApplyingFor: role,
        transactionId: transactionId || null,
        screenshotUrl,
        amount: config.registrationFee,
        status: "PENDING_VERIFICATION"
      }
    });

    return res.status(201).json({
      ok: true,
      message: "Payment submitted successfully. Our team will verify your payment UTR/screenshot soon.",
      verificationId: verification.id
    });
  } catch (dbErr) {
    console.error("Database save failed:", dbErr);
    return res.status(500).json({ error: "Database error saving payment verification." });
  }
});

// 2. GET Pending Payment Verification Submissions (Admin Only)
paymentVerificationsRouter.get("/pending", requireAuth, requireRoles(Role.ADMIN), async (req, res) => {
  try {
    const pendings = await prisma.paymentVerification.findMany({
      where: { status: "PENDING_VERIFICATION" },
      orderBy: { submittedAt: "desc" }
    });
    return res.json({ payments: pendings });
  } catch (err) {
    return res.status(500).json({ error: "Could not retrieve pending payments" });
  }
});

// 2b. GET All Payment Verification Submissions (Admin Only for comprehensive list/filter)
paymentVerificationsRouter.get("/all", requireAuth, requireRoles(Role.ADMIN), async (req, res) => {
  try {
    const payments = await prisma.paymentVerification.findMany({
      orderBy: { submittedAt: "desc" }
    });
    return res.json({ payments });
  } catch (err) {
    return res.status(500).json({ error: "Could not retrieve payment verifications" });
  }
});

// 3. Approve Payment Verification (Admin Only)
paymentVerificationsRouter.post("/:id/approve", requireAuth, requireRoles(Role.ADMIN), async (req, res) => {
  const verificationId = String(req.params.id);

  const payment = await prisma.paymentVerification.findUnique({
    where: { id: verificationId }
  });

  if (!payment) {
    return res.status(404).json({ error: "Payment verification record not found" });
  }

  if (payment.status !== "PENDING_VERIFICATION") {
    return res.status(400).json({ error: "This payment is already processed" });
  }

  const applicant = payment.applicantData as any;
  const phone = applicant.phone;

  // Double check user doesn't already exist
  const existingUser = await prisma.user.findUnique({
    where: { phone }
  });
  if (existingUser) {
    return res.status(409).json({ error: "A user already exists with this phone number." });
  }

  // Resolve sponsor
  let sponsor = null;
  if (applicant.sponsorReferralCode) {
    sponsor = await prisma.user.findUnique({
      where: { referralCode: applicant.sponsorReferralCode.trim().toUpperCase() }
    });
  } else if (applicant.sponsorPhone) {
    sponsor = await prisma.user.findFirst({
      where: { phone: applicant.sponsorPhone }
    });
  } else if (payment.addedByUserId) {
    sponsor = await prisma.user.findUnique({
      where: { id: payment.addedByUserId }
    });
  }

  // MLM business rule assertions
  try {
    if (payment.roleApplyingFor === Role.BETA_MANAGER) {
      if (!sponsor || sponsor.role !== Role.MANAGER) {
        return res.status(400).json({ error: "Beta Manager application requires an active Manager sponsor" });
      }
      await assertCanCreateBetaManager(sponsor.id);
    } else if (payment.roleApplyingFor !== Role.MANAGER) {
      if (!sponsor) {
        return res.status(400).json({ error: "Active sponsor upline is required to activate downline" });
      }
      await assertCanAddDownline({
        sponsorId: sponsor.id,
        newRole: payment.roleApplyingFor,
        placementType: sponsor.placementType
      });
    }
  } catch (ruleErr) {
    return res.status(400).json({ error: ruleErr instanceof Error ? ruleErr.message : "MLM validation failed" });
  }

  // Auto-generate strong secure temporary password
  const tempPassword = applicant.password || `KA@${Math.random().toString(36).slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const betaRootManagerId = payment.roleApplyingFor === Role.BETA_MANAGER ? sponsor?.id : undefined;

      const createdUser = await tx.user.create({
        data: {
          name: applicant.name,
          phone: applicant.phone,
          email: applicant.email || null,
          passwordHash,
          role: payment.roleApplyingFor,
          sponsorId: payment.roleApplyingFor === Role.MANAGER ? undefined : sponsor?.id,
          createdById: payment.addedByUserId || req.user!.id,
          placementType: payment.roleApplyingFor === Role.BETA_MANAGER ? PlacementType.BETA_MATRIX : sponsor?.placementType ?? PlacementType.NORMAL,
          normalManagerId:
            (sponsor?.placementType ?? PlacementType.NORMAL) === PlacementType.NORMAL
              ? payment.roleApplyingFor === Role.MANAGER || payment.roleApplyingFor === Role.BETA_MANAGER
                ? undefined
                : sponsor?.normalManagerId ?? sponsor?.id
              : undefined,
          betaRootManagerId:
            payment.roleApplyingFor === Role.BETA_MANAGER
              ? betaRootManagerId
              : sponsor?.placementType === PlacementType.BETA_MATRIX
              ? sponsor.betaRootManagerId ?? sponsor.id
              : undefined,
          referralCode: referralCodeFromPhone(applicant.phone)
        }
      });

      if (payment.roleApplyingFor === Role.BETA_MANAGER) {
        await tx.betaMatrix.create({
          data: {
            rootManagerId: betaRootManagerId!,
            betaManagerId: createdUser.id
          }
        });
      }

      // Mark payment verification status as APPROVED
      await tx.paymentVerification.update({
        where: { id: payment.id },
        data: {
          status: "APPROVED",
          verifiedAt: new Date(),
          verifiedByAdminId: req.user!.id
        }
      });

      return createdUser;
    });

    await writeAuditLog({
      actorId: req.user!.id,
      action: "PAYMENT_VERIFICATION_APPROVED",
      entityType: "PaymentVerification",
      entityId: payment.id,
      metadata: {
        createdUserId: user.id,
        role: user.role
      }
    });

    let emailSent = false;
    let emailReason = undefined;
    if (user.email) {
      const emailResult = await sendLoginCredentialsEmail({
        to: user.email,
        name: user.name,
        phone: user.phone,
        password: tempPassword,
        role: user.role
      });
      emailSent = emailResult.sent;
      emailReason = emailResult.sent ? undefined : emailResult.reason;
    }

    return res.json({
      ok: true,
      message: "Payment approved and user activated successfully.",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        referralCode: user.referralCode
      },
      credentials: {
        phone: user.phone,
        password: tempPassword,
        emailSent,
        emailReason
      }
    });
  } catch (err) {
    console.error("User activation transaction failed:", err);
    return res.status(500).json({ error: "Could not activate user due to an internal server error" });
  }
});

// 4. Reject Payment Verification (Admin Only)
paymentVerificationsRouter.post("/:id/reject", requireAuth, requireRoles(Role.ADMIN), async (req, res) => {
  const verificationId = String(req.params.id);
  const parsed = rejectPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Reason for rejection is required", details: parsed.error.flatten() });
  }

  const payment = await prisma.paymentVerification.findUnique({
    where: { id: verificationId }
  });

  if (!payment) {
    return res.status(404).json({ error: "Payment verification record not found" });
  }

  if (payment.status !== "PENDING_VERIFICATION") {
    return res.status(400).json({ error: "This payment is already processed" });
  }

  try {
    const updated = await prisma.paymentVerification.update({
      where: { id: payment.id },
      data: {
        status: "REJECTED",
        rejectionReason: parsed.data.reason,
        verifiedAt: new Date(),
        verifiedByAdminId: req.user!.id
      }
    });

    await writeAuditLog({
      actorId: req.user!.id,
      action: "PAYMENT_VERIFICATION_REJECTED",
      entityType: "PaymentVerification",
      entityId: payment.id,
      metadata: { reason: parsed.data.reason }
    });

    return res.json({
      ok: true,
      message: "Payment verification rejected successfully.",
      payment: updated
    });
  } catch (err) {
    return res.status(500).json({ error: "Could not reject payment verification" });
  }
});
