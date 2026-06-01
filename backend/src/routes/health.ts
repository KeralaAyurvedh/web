import { Router } from "express";
import { prisma } from "../utils/prisma";
import { config } from "../utils/config";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "kerala-ayurvedh-backend"
  });
});

healthRouter.get("/ready", async (_req, res) => {
  const missingEnv = Object.entries(config.requiredEnv)
    .filter(([, present]) => !present)
    .map(([name]) => name);

  try {
    await prisma.$queryRaw`SELECT 1`;
    const ready = missingEnv.length === 0;
    return res.status(ready ? 200 : 503).json({
      ok: ready,
      service: "kerala-ayurvedh-backend",
      database: "ready",
      environment: ready ? "ready" : "missing_required_variables",
      missingEnv
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      service: "kerala-ayurvedh-backend",
      database: "unavailable",
      environment: missingEnv.length === 0 ? "ready" : "missing_required_variables",
      missingEnv,
      error: error instanceof Error ? error.message : "Database readiness check failed"
    });
  }
});
