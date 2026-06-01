import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { config } from "../utils/config";
import { requireAuth } from "../middlewares/auth";
import { rateLimit } from "../middlewares/rateLimit";
import { clearFailedLogins, getLoginBlockMessage, recordFailedLogin } from "../utils/loginSecurity";
import { sendForgotPasswordOtpEmail } from "../utils/email";
import { writeAuditLog } from "../utils/audit";


export const authRouter = Router();

const loginSchema = z.object({
  phone: z.string().min(6),
  password: z.string().min(6)
});

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const strongPassword = z.string()
  .min(8, "Password must be at least 8 characters long")
  .regex(passwordRegex, "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character");

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: strongPassword
});

const changeLoginIdSchema = z.object({
  currentPassword: z.string().min(6),
  newPhone: z.string().min(6).max(20).regex(/^[0-9+\-\s]+$/, "Login phone can contain only numbers, spaces, +, and -")
});

const forgotPasswordSchema = z.object({
  phone: z.string().min(6),
  email: z.string().email()
});

const resetPasswordOtpSchema = z.object({
  phone: z.string().min(6),
  otp: z.string().length(6),
  newPassword: strongPassword
});


authRouter.post("/login", rateLimit({ keyPrefix: "auth-login", windowMs: 15 * 60 * 1000, max: 30 }), async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid login details", details: parsed.error.flatten() });
  }

  const blockMessage = getLoginBlockMessage(parsed.data.phone, req.ip);
  if (blockMessage) {
    return res.status(429).json({ error: blockMessage });
  }

  const user = await prisma.user.findUnique({
    where: { phone: parsed.data.phone }
  });

  if (!user) {
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
      if (userPayment.status === "PENDING_VERIFICATION") {
        return res.status(403).json({
          error: "Payment under verification",
          status: "pending_verification"
        });
      } else if (userPayment.status === "REJECTED") {
        return res.status(403).json({
          error: "Payment rejected",
          status: "rejected",
          reason: userPayment.rejectionReason || "No reason provided",
          verificationId: userPayment.id
        });
      }
    }

    recordFailedLogin(parsed.data.phone, req.ip);
    console.log(`[LOGIN FAILED] Phone: ${parsed.data.phone} - Reason: No account found with this phone number. IP: ${req.ip}`);
    return res.status(401).json({ error: "No account found with this phone number." });
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    recordFailedLogin(parsed.data.phone, req.ip);
    console.log(`[LOGIN FAILED] Phone: ${parsed.data.phone} (Name: ${user.name}, Role: ${user.role}) - Reason: Incorrect password. IP: ${req.ip}`);
    return res.status(401).json({ error: "Incorrect password. Please try again." });
  }

  if (user.status !== "ACTIVE") {
    console.log(`[LOGIN FAILED] Phone: ${parsed.data.phone} (Name: ${user.name}, Role: ${user.role}) - Reason: Account status is ${user.status} (Inactive). IP: ${req.ip}`);
    return res.status(403).json({ error: "Your account is inactive. Contact support." });
  }

  clearFailedLogins(parsed.data.phone, req.ip);
  console.log(`[LOGIN SUCCESS] Phone: ${parsed.data.phone} (Name: ${user.name}, Role: ${user.role}) - IP: ${req.ip}`);

  const token = jwt.sign(
    {
      id: user.id,
      userId: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone
    },
    config.jwtSecret,
    { expiresIn: "30d" }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      referralCode: user.referralCode
    }
  });
});

authRouter.post("/change-password", requireAuth, rateLimit({ keyPrefix: "change-password", windowMs: 15 * 60 * 1000, max: 10 }), async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid password details", details: parsed.error.flatten() });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return res.status(400).json({ error: "New password cannot be the same as your current password. Please choose a new password." });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash }
  });

  return res.json({ ok: true });
});

authRouter.patch("/change-login-id", requireAuth, rateLimit({ keyPrefix: "change-login-id", windowMs: 15 * 60 * 1000, max: 10 }), async (req, res) => {
  const parsed = changeLoginIdSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid login ID details", details: parsed.error.flatten() });
  }

  if (req.user!.role !== "ADMIN") {
    return res.status(403).json({ error: "Only Admin can change the login ID" });
  }

  const normalizedPhone = parsed.data.newPhone.replace(/\s+/g, "");
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  const existing = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
  if (existing && existing.id !== user.id) {
    return res.status(409).json({ error: "This login ID is already used by another account" });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { phone: normalizedPhone },
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
    actorId: user.id,
    action: "ADMIN_LOGIN_ID_CHANGED",
    entityType: "User",
    entityId: user.id,
    metadata: { previousPhone: user.phone, newPhone: updated.phone }
  });

  return res.json({ ok: true, user: updated });
});

authRouter.post("/forgot-password", rateLimit({ keyPrefix: "forgot-password", windowMs: 15 * 60 * 1000, max: 5 }), async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid reset details", details: parsed.error.flatten() });
  }

  const user = await prisma.user.findFirst({
    where: {
      phone: parsed.data.phone,
      email: parsed.data.email,
      status: "ACTIVE"
    }
  });

  if (!user) {
    return res.status(404).json({ error: "No active user found matching this phone number and email address" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: otpHash,
      resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000)
    }
  });

  const emailResult = await sendForgotPasswordOtpEmail({
    to: user.email!,
    name: user.name,
    otp
  });

  if (!emailResult.sent) {
    if (config.nodeEnv !== "production") {
      console.log(`[Forgot Password OTP for ${user.phone}]: ${otp} (Email failed: ${emailResult.reason})`);
      return res.json({ ok: true, message: `Verification code generated. (Dev Mode OTP: ${otp})` });
    }

    return res.status(503).json({ error: "Password reset email could not be sent. Please contact support." });
  }

  return res.json({ ok: true, message: "Verification code sent to your registered email address" });
});

authRouter.post("/reset-password-otp", rateLimit({ keyPrefix: "reset-password-otp", windowMs: 15 * 60 * 1000, max: 10 }), async (req, res) => {
  const parsed = resetPasswordOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request details", details: parsed.error.flatten() });
  }

  const user = await prisma.user.findUnique({
    where: { phone: parsed.data.phone }
  });

  if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
    return res.status(400).json({ error: "Invalid or expired reset code" });
  }

  if (new Date() > user.resetPasswordExpires) {
    return res.status(400).json({ error: "Verification code has expired" });
  }

  const matches = await bcrypt.compare(parsed.data.otp, user.resetPasswordToken);
  if (!matches) {
    return res.status(400).json({ error: "Invalid verification code" });
  }

  const isSame = await bcrypt.compare(parsed.data.newPassword, user.passwordHash);
  if (isSame) {
    return res.status(400).json({ error: "New password cannot be the same as your current password. Please choose a new password." });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null
    }
  });

  return res.json({ ok: true, message: "Password reset successfully. You can now login with your new password." });
});

authRouter.get("/resolve-referral/:code", rateLimit({ keyPrefix: "resolve-referral", windowMs: 15 * 60 * 1000, max: 60 }), async (req, res) => {
  const code = String(req.params.code).trim().toUpperCase();
  if (!code || code.length < 3) {
    return res.status(400).json({ error: "Invalid referral code format" });
  }

  const user = await prisma.user.findUnique({
    where: { referralCode: code },
    select: {
      id: true,
      name: true,
      role: true,
      status: true
    }
  });

  if (!user) {
    return res.status(404).json({ error: "Sponsor not found for this referral code" });
  }

  if (user.status !== "ACTIVE") {
    return res.status(400).json({ error: "Sponsor account is currently inactive" });
  }

  if (user.role === "CUSTOMER") {
    return res.status(400).json({ error: "Customers cannot sponsor new members. Upline must be Level 1, Level 2, or Manager." });
  }

  let determinedRole = "CUSTOMER";
  if (user.role === "MANAGER" || user.role === "BETA_MANAGER") {
    determinedRole = "LEVEL_1";
  } else if (user.role === "LEVEL_1") {
    determinedRole = "LEVEL_2";
  }

  return res.json({
    name: user.name,
    role: user.role,
    determinedRole
  });
});

import { getSystemSettings } from "../utils/settings";

authRouter.get("/app-update-status", async (req, res) => {
  const settings = getSystemSettings();
  return res.json(settings);
});
