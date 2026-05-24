import { HelpTopicRole, Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { prisma } from "../utils/prisma";

export const helpRouter = Router();

helpRouter.use(requireAuth);

function roleToHelpRole(role: string) {
  if (role === Role.ADMIN) return HelpTopicRole.ADMIN;
  if (role === Role.MANAGER) return HelpTopicRole.MANAGER;
  if (role === Role.BETA_MANAGER) return HelpTopicRole.BETA_MANAGER;
  if (role === Role.LEVEL_1) return HelpTopicRole.LEVEL_1;
  if (role === Role.LEVEL_2) return HelpTopicRole.LEVEL_2;
  return HelpTopicRole.CUSTOMER;
}

const helpTopicSelect = {
  id: true,
  title: true,
  shortDescription: true,
  content: true,
  role: true,
  category: true,
  steps: true,
  relatedRoute: true,
  videoUrl: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true
};

helpRouter.get("/help-topics", async (req, res) => {
  const role = roleToHelpRole(req.user!.role);
  const topics = await prisma.helpTopic.findMany({
    where: {
      isActive: true,
      role: { in: [HelpTopicRole.ALL, role] }
    },
    select: helpTopicSelect,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });

  return res.json({ topics });
});

helpRouter.get("/help-topics/:id", async (req, res) => {
  const role = roleToHelpRole(req.user!.role);
  const topic = await prisma.helpTopic.findFirst({
    where: {
      id: String(req.params.id),
      isActive: true,
      role: { in: [HelpTopicRole.ALL, role] }
    },
    select: helpTopicSelect
  });

  if (!topic) {
    return res.status(404).json({ error: "Help topic not found" });
  }

  return res.json({ topic });
});
