import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth } from "../middlewares/auth";
import { prisma } from "../utils/prisma";

export const commissionsRouter = Router();

commissionsRouter.get("/me", requireAuth, async (req, res) => {
  if (req.user!.role === Role.CUSTOMER) {
    return res.status(403).json({ error: "Customers do not have commissions" });
  }

  const commissions = await prisma.commissionLedger.findMany({
    where: { receiverId: req.user!.id },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ commissions });
});


commissionsRouter.get("/", requireAuth, async (req, res) => {
  if (req.user!.role !== Role.ADMIN) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const commissions = await prisma.commissionLedger.findMany({
    include: {
      receiver: {
        select: { id: true, name: true, phone: true, role: true }
      },
      sourceUser: {
        select: { id: true, name: true, phone: true, role: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ commissions });
});
