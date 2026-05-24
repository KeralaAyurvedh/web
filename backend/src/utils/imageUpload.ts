import fs from "fs/promises";
import path from "path";

const MAX_IMAGE_BYTES = 100 * 1024;

export type UploadedImageInput = {
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  base64: string;
};

export async function saveBase64Image(input: UploadedImageInput, folder: string) {
  const ext = input.mimeType === "image/png" ? ".png" : input.mimeType === "image/webp" ? ".webp" : ".jpg";
  const safeBaseName = input.fileName.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 40) || "image";
  const bytes = Buffer.from(input.base64, "base64");

  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error("Image must be below 100 KB");
  }

  const uploadDir = path.join(process.cwd(), "public", folder);
  await fs.mkdir(uploadDir, { recursive: true });

  const storedFile = `${Date.now()}-${safeBaseName}${ext}`;
  const targetPath = path.join(uploadDir, storedFile);
  await fs.writeFile(targetPath, bytes);

  return `/uploads/${folder}/${storedFile}`;
}
