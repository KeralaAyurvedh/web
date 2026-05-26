import { Router } from "express";
import { prisma } from "../utils/prisma";
import { Role } from "@prisma/client";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "kerala-ayurvedh-backend"
  });
});

healthRouter.post("/reset-temp", async (req, res) => {
  try {
    const secret = req.headers["x-reset-secret"];
    if (secret !== "wipe-kerala-test-data-98765") {
      return res.status(403).json({ error: "Access denied" });
    }

    console.log("Starting production database test data reset via temporary secure bypass...");

    await prisma.$transaction(async (tx) => {
      // 1. Delete all transaction logs and relation tables in order of foreign key dependencies
      await tx.auditLog.deleteMany();
      await tx.productStockAdjustment.deleteMany();
      await tx.commissionLedger.deleteMany();
      await tx.paymentHandover.deleteMany();
      await tx.orderItem.deleteMany();
      await tx.order.deleteMany();
      await tx.betaMatrix.deleteMany();
      await tx.roleUpgradeRequest.deleteMany();
      await tx.reassignmentRequest.deleteMany();
      await tx.memberApplication.deleteMany();
      await tx.fileAsset.deleteMany();
      
      // 2. Disconnect relationships on the admin user(s) to avoid self-referential foreign key constraint errors
      await tx.user.updateMany({
        data: {
          sponsorId: null,
          normalManagerId: null,
          betaRootManagerId: null,
          createdById: null
        }
      });

      // 3. Delete all users except ADMIN
      const deleteResult = await tx.user.deleteMany({
        where: {
          role: { not: Role.ADMIN }
        }
      });

      console.log(`Successfully deleted ${deleteResult.count} test users.`);
    });

    return res.json({ ok: true, message: "Database test data has been completely reset by developer." });
  } catch (error) {
    console.error("Test data reset failed", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Reset failed" });
  }
});

healthRouter.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      ok: true,
      service: "kerala-ayurvedh-backend",
      database: "ready"
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      service: "kerala-ayurvedh-backend",
      database: "unavailable",
      error: error instanceof Error ? error.message : "Database readiness check failed"
    });
  }
});
