import { Router } from "express";
import { getRawFileAccess } from "../services/storage";

export const filesRouter = Router();

filesRouter.get("/:id/raw", async (req, res) => {
  const fileId = String(req.params.id);
  const expires = typeof req.query.expires === "string" ? req.query.expires : "";
  const signature = typeof req.query.signature === "string" ? req.query.signature : "";

  const access = await getRawFileAccess(fileId, expires, signature);
  if (!access) {
    return res.status(404).json({ error: "File not found" });
  }
  if ("forbidden" in access) {
    return res.status(403).json({ error: "File link expired or invalid" });
  }
  if ("url" in access && typeof access.url === "string") {
    return res.redirect(access.url);
  }

  res.type(access.file.mimeType);
  return res.sendFile(access.absolutePath);
});
