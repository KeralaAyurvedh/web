import dotenv from "dotenv";

dotenv.config();

const defaultJwtSecret = "change-this-secret-before-production";
const nodeEnv = process.env.NODE_ENV ?? "development";
const jwtSecret = process.env.JWT_SECRET ?? defaultJwtSecret;
const smtpSecure = process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465";
const storageProvider = process.env.STORAGE_PROVIDER === "r2" ? "r2" : "local";
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : undefined;

if (nodeEnv === "production" && jwtSecret === defaultJwtSecret) {
  throw new Error("JWT_SECRET must be changed before running in production");
}

if (nodeEnv === "production" && jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production");
}

export const config = {
  nodeEnv,
  port: Number(process.env.PORT) || 4000,
  jwtSecret,
  corsOrigins,
  jsonBodyLimit: process.env.JSON_BODY_LIMIT ?? "1mb",
  databaseStorageLimitMb: process.env.DATABASE_STORAGE_LIMIT_MB
    ? Number(process.env.DATABASE_STORAGE_LIMIT_MB)
    : undefined,
  smtp: {
    host: process.env.SMTP_HOST || undefined,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: smtpSecure,
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || undefined,
    fromName: process.env.SMTP_FROM_NAME || "Kerala Ayurvedh"
  },
  supportEmail: process.env.SUPPORT_EMAIL || process.env.SMTP_FROM_EMAIL || undefined,
  backup: {
    localDir: process.env.BACKUP_DIR || "backups",
    maxAgeHours: Number(process.env.BACKUP_MAX_AGE_HOURS ?? 30)
  },
  storage: {
    provider: storageProvider,
    localUploadDir: process.env.LOCAL_UPLOAD_DIR || "public",
    localPrivateUploadDir: process.env.LOCAL_PRIVATE_UPLOAD_DIR || "private-uploads",
    bucket: process.env.R2_BUCKET || undefined,
    region: process.env.R2_REGION || "auto",
    endpoint: process.env.R2_ENDPOINT || undefined,
    accessKeyId: process.env.R2_ACCESS_KEY_ID || undefined,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || undefined,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL || undefined,
    forcePathStyle: process.env.R2_FORCE_PATH_STYLE === "true",
    signedUrlExpiresSeconds: Number(process.env.STORAGE_SIGNED_URL_EXPIRES_SECONDS ?? 300)
  }
};
