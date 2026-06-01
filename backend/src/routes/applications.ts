import { Router } from "express";
import { ApplicationStatus, Role } from "@prisma/client";
import { z } from "zod";
import { rateLimit } from "../middlewares/rateLimit";
import { prisma } from "../utils/prisma";

export const applicationsRouter = Router();

const applicationSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email("A valid email address is required"),
  requestedRole: z.enum([Role.MANAGER, Role.BETA_MANAGER, Role.LEVEL_1, Role.LEVEL_2, Role.CUSTOMER]).optional(),
  sponsorPhone: z.string().min(6).optional(),
  sponsorReferralCode: z.string().optional(),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "A valid 12-digit Aadhaar number is required"),
  panNumber: z.preprocess(
    (value) => typeof value === "string" ? value.trim().toUpperCase() : value,
    z.string().optional()
  ).optional(),
  privacyConsentAccepted: z.literal(true, {
    error: "Privacy consent is required before submitting Aadhaar/PAN details"
  })
});

applicationsRouter.post("/", rateLimit({ keyPrefix: "applications-create", windowMs: 15 * 60 * 1000, max: 20 }), async (req, res) => {
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid application details", details: parsed.error.flatten() });
  }

  const input = parsed.data;
  let finalRole: Role;
  let finalSponsorPhone = input.sponsorPhone;

  if (input.sponsorReferralCode) {
    const code = input.sponsorReferralCode.trim().toUpperCase();
    const sponsor = await prisma.user.findUnique({
      where: { referralCode: code }
    });

    if (!sponsor) {
      return res.status(400).json({ error: "Sponsor not found for the provided referral code" });
    }
    if (sponsor.status !== "ACTIVE") {
      return res.status(400).json({ error: "Sponsor account is currently inactive" });
    }
    if (sponsor.role === Role.CUSTOMER) {
      return res.status(400).json({ error: "Customers cannot sponsor new members. Sponsor must be Level 1, Level 2, or Manager." });
    }

    // Auto-determine role
    if (sponsor.role === Role.MANAGER || sponsor.role === Role.BETA_MANAGER) {
      finalRole = Role.LEVEL_1;
    } else if (sponsor.role === Role.LEVEL_1) {
      finalRole = Role.LEVEL_2;
    } else {
      finalRole = Role.CUSTOMER;
    }

    finalSponsorPhone = sponsor.phone;
  } else {
    // No referral code provided
    if (input.requestedRole === Role.MANAGER) {
      finalRole = Role.MANAGER;
    } else if (input.sponsorPhone) {
      const sponsor = await prisma.user.findFirst({
        where: { phone: input.sponsorPhone }
      });
      if (!sponsor) {
        return res.status(400).json({ error: "Sponsor not found for the provided phone number" });
      }
      if (input.requestedRole) {
        finalRole = input.requestedRole;
      } else {
        if (sponsor.role === Role.MANAGER || sponsor.role === Role.BETA_MANAGER) {
          finalRole = Role.LEVEL_1;
        } else if (sponsor.role === Role.LEVEL_1) {
          finalRole = Role.LEVEL_2;
        } else {
          finalRole = Role.CUSTOMER;
        }
      }
    } else {
      return res.status(400).json({ error: "Sponsor referral code is required for registration" });
    }
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: input.phone },
        ...(input.email ? [{ email: input.email }] : [])
      ]
    }
  });

  if (existingUser) {
    return res.status(409).json({ error: "A user already exists with this phone or email" });
  }

  const existingPendingApplication = await prisma.memberApplication.findFirst({
    where: {
      status: ApplicationStatus.PENDING,
      OR: [
        { phone: input.phone },
        ...(input.email ? [{ email: input.email }] : [])
      ]
    }
  });

  if (existingPendingApplication) {
    return res.status(409).json({ error: "A pending application already exists with this phone or email" });
  }

  try {
    const application = await prisma.memberApplication.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        requestedRole: finalRole,
        sponsorPhone: finalSponsorPhone,
        aadhaarNumber: input.aadhaarNumber,
        panNumber: input.panNumber,
        privacyConsentAcceptedAt: new Date()
      }
    });

    return res.status(201).json({ application });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "Could not submit application" });
  }
});

const statusSchema = z.object({
  phone: z.string().min(6)
});

applicationsRouter.post("/status", rateLimit({ keyPrefix: "applications-status", windowMs: 15 * 60 * 1000, max: 40 }), async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid phone", details: parsed.error.flatten() });
  }

  const application = await prisma.memberApplication.findFirst({
    where: { phone: parsed.data.phone },
    select: {
      id: true,
      name: true,
      phone: true,
      requestedRole: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      decidedAt: true
    },
    orderBy: { createdAt: "desc" }
  });

  if (!application) {
    const verifications = await prisma.paymentVerification.findMany({
      where: {
        status: { in: ["PENDING_VERIFICATION", "REJECTED"] }
      },
      orderBy: { submittedAt: "desc" }
    });

    const userPayment = verifications.find((v) => {
      const data = v.applicantData as any;
      return data && data.phone === parsed.data.phone;
    });

    if (userPayment) {
      const applicant = userPayment.applicantData as any;
      return res.json({
        application: {
          id: userPayment.id,
          name: applicant.name,
          phone: applicant.phone,
          requestedRole: userPayment.roleApplyingFor,
          status: userPayment.status,
          rejectionReason: userPayment.rejectionReason,
          createdAt: userPayment.submittedAt,
          decidedAt: userPayment.verifiedAt
        }
      });
    }

    return res.status(404).json({ error: "No application found for this phone number" });
  }

  return res.json({ application });
});
