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
const r2SigningService = "s3"; // Cloudflare R2 uses the S3-compatible AWS Signature V4 service name.

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

function encodedStorageKey(key: string) {
  return key.split("/").map(encodeRfc3986).join("/");
}

function r2Host() {
  if (!config.storage.bucket) throw new Error("R2_BUCKET is required for R2 storage");
  if (config.storage.endpoint) {
    const endpoint = new URL(config.storage.endpoint);
    return config.storage.forcePathStyle
      ? endpoint.host
      : `${config.storage.bucket}.${endpoint.host}`;
  }
  throw new Error("R2_ENDPOINT is required for R2 storage");
}

function r2Path(key: string) {
  if (!config.storage.bucket) throw new Error("R2_BUCKET is required for R2 storage");
  if (!config.storage.endpoint || !config.storage.forcePathStyle) return `/${encodedStorageKey(key)}`;
  return `/${config.storage.bucket}/${encodedStorageKey(key)}`;
}

function r2Url(key: string) {
  const protocol = config.storage.endpoint ? new URL(config.storage.endpoint).protocol : "https:";
  return `${protocol}//${r2Host()}${r2Path(key)}`;
}

function r2SigningKey(date: string) {
  if (!config.storage.secretAccessKey) throw new Error("R2_SECRET_ACCESS_KEY is required for R2 storage");
  const kDate = hmac(`AWS4${config.storage.secretAccessKey}`, date);
  const kRegion = hmac(kDate, config.storage.region);
  const kService = hmac(kRegion, r2SigningService);
  return hmac(kService, "aws4_request");
}

function assertR2Config() {
  if (!config.storage.bucket || !config.storage.accessKeyId || !config.storage.secretAccessKey) {
    throw new Error("R2 storage is not fully configured");
  }
}

function assertSupabaseConfig() {
  if (!config.storage.supabaseUrl || !config.storage.supabaseServiceRoleKey || !config.storage.supabaseBucket) {
    throw new Error("Supabase storage is not fully configured");
  }
}

function supabaseStorageBaseUrl() {
  assertSupabaseConfig();
  return config.storage.supabaseUrl!.replace(/\/$/, "");
}

function supabaseObjectUrl(key: string) {
  return `${supabaseStorageBaseUrl()}/storage/v1/object/${encodeRfc3986(config.storage.supabaseBucket!)}/${encodedStorageKey(key)}`;
}

function supabasePublicUrl(key: string) {
  return `${supabaseStorageBaseUrl()}/storage/v1/object/public/${encodeRfc3986(config.storage.supabaseBucket!)}/${encodedStorageKey(key)}`;
}

function supabaseHeaders(extra?: Record<string, string>) {
  assertSupabaseConfig();
  return {
    Authorization: `Bearer ${config.storage.supabaseServiceRoleKey}`,
    apikey: config.storage.supabaseServiceRoleKey!,
    ...extra
  };
}

function r2Authorization(method: "PUT", key: string, mimeType: string, payload: Buffer) {
  assertR2Config();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const host = r2Host();
  const canonicalHeaders = `content-type:${mimeType}\nhost:${host}\nx-amz-content-sha256:${sha256Hex(payload)}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    r2Path(key),
    "",
    canonicalHeaders,
    signedHeaders,
    sha256Hex(payload)
  ].join("\n");
  const credentialScope = `${date}/${config.storage.region}/${r2SigningService}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  const signature = hmacHex(r2SigningKey(date), stringToSign);

  return {
    host,
    amzDate,
    payloadHash: sha256Hex(payload),
    authorization: `AWS4-HMAC-SHA256 Credential=${config.storage.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
}

function presignedR2Url(key: string, expiresSeconds: number) {
  assertR2Config();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const host = r2Host();
  const credentialScope = `${date}/${config.storage.region}/${r2SigningService}/aws4_request`;
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
    r2Path(key),
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
  query.set("X-Amz-Signature", hmacHex(r2SigningKey(date), stringToSign));
  return `${r2Url(key)}?${query.toString()}`;
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

  if (config.storage.provider === "r2") {
    provider = FileAssetStorageProvider.R2;
    bucket = config.storage.bucket;
    const auth = r2Authorization("PUT", key, input.mimeType, input.buffer);
    const response = await fetch(r2Url(key), {
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
      throw new Error(`R2 upload failed with status ${response.status}`);
    }
    publicUrl = isPrivate
      ? undefined
      : config.storage.publicBaseUrl
        ? `${config.storage.publicBaseUrl.replace(/\/$/, "")}/${key}`
        : r2Url(key);
  } else if (config.storage.provider === "supabase") {
    provider = FileAssetStorageProvider.SUPABASE;
    bucket = config.storage.supabaseBucket;
    const response = await fetch(supabaseObjectUrl(key), {
      method: "POST",
      headers: supabaseHeaders({
        "Content-Type": input.mimeType,
        "x-upsert": "false"
      }),
      body: input.buffer as unknown as BodyInit
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Supabase upload failed with status ${response.status}${body ? `: ${body}` : ""}`);
    }
    publicUrl = isPrivate ? undefined : supabasePublicUrl(key);
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
  let url: string;
  if (file.storageProvider === FileAssetStorageProvider.R2) {
    url = presignedR2Url(file.key, expiresSeconds);
  } else if (file.storageProvider === FileAssetStorageProvider.SUPABASE) {
    assertSupabaseConfig();
    const response = await fetch(
      `${supabaseStorageBaseUrl()}/storage/v1/object/sign/${encodeRfc3986(config.storage.supabaseBucket!)}/${encodedStorageKey(file.key)}`,
      {
        method: "POST",
        headers: supabaseHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ expiresIn: expiresSeconds })
      }
    );
    if (!response.ok) {
      throw new Error(`Supabase signed URL failed with status ${response.status}`);
    }
    const body = await response.json() as { signedURL?: string; signedUrl?: string };
    const signedPath = body.signedURL ?? body.signedUrl;
    if (!signedPath) {
      throw new Error("Supabase signed URL was not returned");
    }
    url = signedPath.startsWith("http") ? signedPath : `${supabaseStorageBaseUrl()}${signedPath}`;
  } else {
    url = localSignedUrl(file.id, expiresSeconds);
  }

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
