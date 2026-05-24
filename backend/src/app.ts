import express from "express";
import cors from "cors";
import path from "path";
import { config } from "./utils/config";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { productsRouter } from "./routes/products";
import { ordersRouter } from "./routes/orders";
import { commissionsRouter } from "./routes/commissions";
import { paymentsRouter } from "./routes/payments";
import { matrixRouter } from "./routes/matrix";
import { adminRouter } from "./routes/admin";
import { applicationsRouter } from "./routes/applications";
import { helpRouter } from "./routes/help";
import { filesRouter } from "./routes/files";
import { securityHeaders } from "./middlewares/securityHeaders";

function storagePath(root: string) {
  return path.isAbsolute(root) ? root : path.join(process.cwd(), root);
}

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(securityHeaders);
  app.use(cors({
    origin: config.corsOrigins && config.corsOrigins.length > 0 ? config.corsOrigins : true
  }));
  app.use(express.json({ limit: config.jsonBodyLimit }));
  app.use("/uploads", express.static(storagePath(config.storage.localUploadDir)));
  if (config.storage.localUploadDir !== "public") {
    app.use("/uploads", express.static(storagePath("public")));
  }

  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/products", productsRouter);
  app.use("/orders", ordersRouter);
  app.use("/payments", paymentsRouter);
  app.use("/commissions", commissionsRouter);
  app.use("/matrix", matrixRouter);
  app.use("/applications", applicationsRouter);
  app.use("/files", filesRouter);
  app.use("/", helpRouter);
  app.use("/admin", adminRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  return app;
}
