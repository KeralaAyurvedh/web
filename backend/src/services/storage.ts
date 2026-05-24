import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { FileAssetCategory, FileAssetStorageProvider } from "@prisma/client";
import { config } from "../utils/config";
import { prisma } from "../utils/prisma";

type UploadInput = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  category: FileAssetCategory;
  isPrivate: boolean;
  uploadedById?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
};

const publicCategories = new Set<FileAssetCategory>([FileAssetCategory.PRODUCT_IMAGE]);

function extensionFromMime(mimeType: string) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "application/pdf") return ".pdf";
  return ".jpg";
}

function categoryFolder(category: FileAssetCategory) {
  return category.toLowerCase().replace(/_/g, "-");
}

function storagePath(root: string, ...segments: string[]) {
  return path.join(path.isAbsolute(root) ? root : path.join(process.cwd(), root), ...segments);
}

function sha256Hex(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function hmacHex(key: Buffer | string, value: string) {
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function s3Host() {
  if (!config.storage.bucket) throw new Error("STORAGE_BUCKET is required for s3 storage");
  if (config.storage.endpoint) {
    const endpoint = new URL(config.storage.endpoint);
    return config.storage.forcePathStyle
      ? endpoint.host
      : `${config.storage.bucket}.${endpoint.host}`;
  }
  return `${config.storage.bucket}.s3.${config.storage.region}.amazonaws.com`;
}

function s3Path(key: string) {
  if (!config.storage.bucket) throw new Error("STORAGE_BUCKET is required for s3 storage");
  if (!config.storage.endpoint || !config.storage.forcePathStyle) return `/${key.split("/").map(encodeRfc3986).join("/")}`;
  return `/${config.storage.bucket}/${key.split("/").map(encodeRfc3986).join("/")}`;
}

function s3Url(key: string) {
  const protocol = config.storage.endpoint ? new URL(config.storage.endpoint).protocol : "https:";
  return `${protocol}//${s3Host()}${s3Path(key)}`;
}

function s3SigningKey(date: string) {
  if (!config.storage.secretAccessKey) throw new Error("STORAGE_SECRET_ACCESS_KEY is required for s3 storage");
  const kDate = hmac(`AWS4${config.storage.secretAccessKey}`, date);
  const kRegion = hmac(kDate, config.storage.region);
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

function assertS3Config() {
  if (!config.storage.bucket || !config.storage.accessKeyId || !config.storage.secretAccessKey) {
    throw new Error("S3 storage is not fully configured");
  }
}

function s3Authorization(method: "PUT", key: string, mimeType: string, payload: Buffer) {
  assertS3Config();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const host = s3Host();
  const canonicalHeaders = `content-type:${mimeType}\nhost:${host}\nx-amz-content-sha256:${sha256Hex(payload)}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    s3Path(key),
    "",
    canonicalHeaders,
    signedHeaders,
    sha256Hex(payload)
  ].join("\n");
  const credentialScope = `${date}/${config.storage.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  const signature = hmacHex(s3SigningKey(date), stringToSign);

  return {
    host,
    amzDate,
    payloadHash: sha256Hex(payload),
    authorization: `AWS4-HMAC-SHA256 Credential=${config.storage.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
}

function presignedS3Url(key: string, expiresSeconds: number) {
  assertS3Config();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const host = s3Host();
  const credentialScope = `${date}/${config.storage.region}/s3/aws4_request`;
  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.storage.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": "host"
  });
  const canonicalQuery = [...query.entries()]
    .map(([keyName, value]) => `${encodeRfc3986(keyName)}=${encodeRfc3986(value)}`)
    .sort()
    .join("&");
  const canonicalRequest = [
    "GET",
    s3Path(key),
    canonicalQuery,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD"
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  query.set("X-Amz-Signature", hmacHex(s3SigningKey(date), stringToSign));
  return `${s3Url(key)}?${query.toString()}`;
}

function localSignedUrl(fileId: string, expiresSeconds: number) {
  const expires = Math.floor(Date.now() / 1000) + expiresSeconds;
  const signature = hmacHex(config.jwtSecret, `${fileId}:${expires}`);
  return `/files/${fileId}/raw?expires=${expires}&signature=${signature}`;
}

export function verifyLocalFileSignature(fileId: string, expires: string, signature: string) {
  const expiresNumber = Number(expires);
  if (!expiresNumber || expiresNumber < Math.floor(Date.now() / 1000)) return false;
  const expected = hmacHex(config.jwtSecret, `${fileId}:${expiresNumber}`);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function storageKeyFor(category: FileAssetCategory, isPrivate: boolean, mimeType: string) {
  const privacy = isPrivate ? "private" : "public";
  return `${privacy}/${categoryFolder(category)}/${crypto.randomUUID()}${extensionFromMime(mimeType)}`;
}

export async function uploadFile(input: UploadInput) {
  const isPrivate = input.isPrivate || !publicCategories.has(input.category);
  const key = storageKeyFor(input.category, isPrivate, input.mimeType);
  let publicUrl: string | undefined;
  let provider: FileAssetStorageProvider = FileAssetStorageProvider.LOCAL;
  let bucket: string | undefined;

  if (config.storage.provider === "s3") {
    provider = FileAssetStorageProvider.S3;
    bucket = config.storage.bucket;
    const auth = s3Authorization("PUT", key, input.mimeType, input.buffer);
    const response = await fetch(s3Url(key), {
      method: "PUT",
      headers: {
        Authorization: auth.authorization,
        "Content-Type": input.mimeType,
        "x-amz-content-sha256": auth.payloadHash,
        "x-amz-date": auth.amzDate
      },
      body: input.buffer as unknown as BodyInit
    });
    if (!response.ok) {
      throw new Error(`S3 upload failed with status ${response.status}`);
    }
    publicUrl = isPrivate
      ? undefined
      : config.storage.publicBaseUrl
        ? `${config.storage.publicBaseUrl.replace(/\/$/, "")}/${key}`
        : s3Url(key);
  } else {
    const root = isPrivate ? config.storage.localPrivateUploadDir : config.storage.localUploadDir;
    const relativeKey = key.replace(/^private\//, "").replace(/^public\//, "");
    const absolutePath = storagePath(root, relativeKey);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, input.buffer);
    publicUrl = isPrivate ? undefined : `/uploads/${relativeKey.replace(/\\/g, "/")}`;
  }

  return prisma.fileAsset.create({
    data: {
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.length,
      category: input.category,
      storageProvider: provider,
      bucket,
      key,
      publicUrl,
      uploadedById: input.uploadedById,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      isPrivate
    }
  });
}

export async function getSignedViewUrl(fileId: string) {
  const file = await prisma.fileAsset.findUnique({ where: { id: fileId } });
  if (!file) return null;
  if (!file.isPrivate && file.publicUrl) {
    return { file, url: file.publicUrl, expiresAt: null };
  }

  const expiresSeconds = config.storage.signedUrlExpiresSeconds;
  const expiresAt = new Date(Date.now() + expiresSeconds * 1000).toISOString();
  const url = file.storageProvider === FileAssetStorageProvider.S3
    ? presignedS3Url(file.key, expiresSeconds)
    : localSignedUrl(file.id, expiresSeconds);

  return { file, url, expiresAt };
}

export async function getLocalPrivateFilePath(fileId: string) {
  const file = await prisma.fileAsset.findUnique({ where: { id: fileId } });
  if (!file || file.storageProvider !== FileAssetStorageProvider.LOCAL || !file.isPrivate) return null;
  const relativeKey = file.key.replace(/^private\//, "").replace(/^public\//, "");
  return {
    file,
    absolutePath: storagePath(config.storage.localPrivateUploadDir, relativeKey)
  };
}
