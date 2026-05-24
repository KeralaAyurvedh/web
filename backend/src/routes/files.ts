import { Router } from "express";
import { getLocalPrivateFilePath, verifyLocalFileSignature } from "../services/storage";

export const filesRouter = Router();

filesRouter.get("/:id/raw", async (req, res) => {
  const fileId = String(req.params.id);
  const expires = typeof req.query.expires === "string" ? req.query.expires : "";
  const signature = typeof req.query.signature === "string" ? req.query.signature : "";

  if (!verifyLocalFileSignature(fileId, expires, signature)) {
    return res.status(403).json({ error: "File link expired or invalid" });
  }

  const localFile = await getLocalPrivateFilePath(fileId);
  if (!localFile) {
    return res.status(404).json({ error: "File not found" });
  }

  res.type(localFile.file.mimeType);
  return res.sendFile(localFile.absolutePath);
});
