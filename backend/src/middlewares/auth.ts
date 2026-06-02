import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../utils/config";
import { prisma } from "../utils/prisma";

export type AuthUser = {
  id: string;
  role: string;
};

const AUTH_USER_CACHE_TTL_MS = 5_000;
type AuthUserCacheEntry = {
  expiresAt: number;
  user: {
    id: string;
    role: string;
    status: string;
  };
};
const authUserCache = new Map<string, AuthUserCacheEntry>();

export function invalidateAuthUserCache(userId?: string) {
  if (userId) {
    authUserCache.delete(userId);
    return;
  }
  authUserCache.clear();
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as Partial<AuthUser>;
    if (!payload.id || !payload.role) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const cached = authUserCache.get(payload.id);
    const user = cached && cached.expiresAt > Date.now()
      ? cached.user
      : await prisma.user.findUnique({
          where: { id: payload.id },
          select: { id: true, role: true, status: true }
        });

    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({ error: "Account is not active" });
    }

    if (!cached || cached.expiresAt <= Date.now()) {
      authUserCache.set(user.id, {
        expiresAt: Date.now() + AUTH_USER_CACHE_TTL_MS,
        user
      });
    }

    req.user = { id: user.id, role: user.role };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Permission denied" });
    }

    return next();
  };
}
