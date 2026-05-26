import { Router } from "express";
import { prisma } from "../utils/prisma";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "kerala-ayurvedh-backend"
  });
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
