import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth } from "../middlewares/auth";
import { prisma } from "../utils/prisma";

export const matrixRouter = Router();

matrixRouter.get("/", requireAuth, async (req, res) => {
  const user = req.user!;

  if (user.role !== Role.ADMIN && user.role !== Role.MANAGER && user.role !== Role.BETA_MANAGER) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const where =
    user.role === Role.ADMIN
      ? {}
      : user.role === Role.MANAGER
        ? { rootManagerId: user.id }
        : { betaManagerId: user.id };


  const matrices = await prisma.betaMatrix.findMany({
    where,
    include: {
      rootManager: {
        select: {
          id: true,
          name: true,
          phone: true,
          role: true
        }
      },
      betaManager: {
        select: {
          id: true,
          name: true,
          phone: true,
          role: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const visibleMatrices = matrices.map((matrix) => {
    if (user.role === Role.ADMIN) return matrix;
    if (user.role === Role.MANAGER) {
      return {
        ...matrix,
        rootManager: matrix.rootManager.id === user.id ? matrix.rootManager : null
      };
    }
    if (user.role === Role.BETA_MANAGER) {
      return {
        ...matrix,
        rootManager: null,
        betaManager: matrix.betaManager.id === user.id ? matrix.betaManager : null
      };
    }
    return matrix;
  });

  return res.json({ matrices: visibleMatrices });
});
