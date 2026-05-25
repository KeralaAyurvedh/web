# Backend Deployment Guide

Use this when deploying the Kerala Ayurvedh backend to a production server.

## Information Needed

- Domain or API subdomain, for example `api.your-domain.com`.
- Server access or hosting provider details.
- Production PostgreSQL database URL.
- SMTP credentials already configured in production `.env`.
- Cloudflare R2 or another object storage provider if production file storage is cloud-based.

## Backend Environment

Create `backend/.env` on the production server:

```env
NODE_ENV="production"
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="replace-with-a-long-random-secret-at-least-32-characters"
PORT=4000
CORS_ORIGIN="https://your-domain.com,https://www.your-domain.com"
JSON_BODY_LIMIT="1mb"
DATABASE_STORAGE_LIMIT_MB=""
SUPPORT_EMAIL="support@keralaayurvedh.com"
BACKUP_DIR="backups"
BACKUP_MAX_AGE_HOURS=30
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM_EMAIL=""
SMTP_FROM_NAME="Kerala Ayurvedh"
STORAGE_PROVIDER="local"
R2_BUCKET=""
R2_REGION="auto"
R2_ENDPOINT=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_PUBLIC_BASE_URL=""
R2_FORCE_PATH_STYLE=false
STORAGE_SIGNED_URL_EXPIRES_SECONDS=300
```

For Supabase, use the transaction pooler URL for `DATABASE_URL` and the session
pooler or direct URL for `DIRECT_URL`. Prisma migrations use `DIRECT_URL`; the
running backend uses `DATABASE_URL`.

For Railway/Render persistent volumes, set upload paths to the mounted volume:

```env
LOCAL_UPLOAD_DIR="/data/public"
LOCAL_PRIVATE_UPLOAD_DIR="/data/private-uploads"
BACKUP_DIR="/data/backups"
```

## Deploy Commands

```powershell
cd backend
npm install
npx prisma generate
npm run build
npm run seed:deploy
npm run start:deploy
```

For long-running production service management, run the backend under the hosting provider process manager, Windows service, PM2, Docker, or systemd.

For Railway/Render:

```bash
Build command: npm install && npx prisma generate && npm run build
Start command: npm run start:deploy
Health check path: /health
```

Run `npm run seed:deploy` manually after the first successful production deploy, with
`SEED_ADMIN_PASSWORD` set when creating the initial admin user.

For Vercel Hobby/no-card deployment:

```bash
Root directory: backend
Build command: npm run vercel-build
Output directory: leave blank
```

Use temporary local upload paths on Vercel:

```env
STORAGE_PROVIDER="local"
LOCAL_UPLOAD_DIR="/tmp/public"
LOCAL_PRIVATE_UPLOAD_DIR="/tmp/private-uploads"
BACKUP_DIR="/tmp/backups"
```

This lets the API run without R2, but uploaded receipts, generated APK files, and backup zip files are not permanent on serverless storage.

## Backups

Run the backup script on a schedule:

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File scripts/backup.ps1
```

Recommended schedule:

- Daily before midnight.
- Keep a copy outside the production server.
- Restore-test a backup before launch.

The Company Admin System Monitor now reads `BACKUP_DIR` and reports latest backup age/status.

## Website And APK URLs

Website:

```env
NEXT_PUBLIC_APK_DOWNLOAD_URL="https://api.your-domain.com/uploads/kerala-ayurvedh.apk"
```

Mobile APK build:

```env
EXPO_PUBLIC_API_URL="https://api.your-domain.com"
```
