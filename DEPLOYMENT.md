# Backend Deployment Guide

Use this when deploying the Kerala Ayurvedh backend to a production server.

## Information Needed

- Domain or API subdomain, for example `api.your-domain.com`.
- Server access or hosting provider details.
- Production PostgreSQL database URL.
- SMTP credentials already configured in production `.env`.
- S3-compatible storage credentials if production file storage is cloud-based.

## Backend Environment

Create `backend/.env` on the production server:

```env
NODE_ENV="production"
DATABASE_URL="postgresql://..."
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
STORAGE_BUCKET=""
STORAGE_REGION="us-east-1"
STORAGE_ENDPOINT=""
STORAGE_ACCESS_KEY_ID=""
STORAGE_SECRET_ACCESS_KEY=""
STORAGE_PUBLIC_BASE_URL=""
STORAGE_FORCE_PATH_STYLE=false
STORAGE_SIGNED_URL_EXPIRES_SECONDS=300
```

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
npm run start:deploy
```

For long-running production service management, run the backend under the hosting provider process manager, Windows service, PM2, Docker, or systemd.

For Railway/Render:

```bash
Build command: npm install && npx prisma generate && npm run build
Start command: npm run start:deploy
Health check path: /health
```

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
