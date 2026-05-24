# Production Readiness Checklist

This file tracks the remaining tasks that require real business or hosting details. The app code is prepared for these values, but they cannot be completed without the actual credentials and decisions.

## Required Business Inputs

- Production domain name, for example `keralaayurvedh.com`.
- Backend hosting provider and server access.
- Production PostgreSQL database URL.
- S3-compatible storage bucket, endpoint, access key, and secret key.
- Brevo/SMTP username, password, sender email, and verified sender domain.
- Official support email address. The app uses email-only support communication.
- Approved privacy policy and consent text for Aadhaar/PAN number collection.

## Backend Environment

Set these in the production backend `.env`:

```env
NODE_ENV="production"
DATABASE_URL="postgresql://..."
JWT_SECRET="replace-with-32-plus-character-secret"
PORT=4000
CORS_ORIGIN="https://your-domain.com,https://www.your-domain.com"
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="real-smtp-user"
SMTP_PASS="real-smtp-password"
SMTP_FROM_EMAIL="verified-sender@your-domain.com"
SMTP_FROM_NAME="Kerala Ayurvedh"
SUPPORT_EMAIL="support@your-domain.com"
STORAGE_PROVIDER="s3"
STORAGE_BUCKET="real-bucket-name"
STORAGE_REGION="us-east-1"
STORAGE_ENDPOINT="https://storage-provider-endpoint"
STORAGE_ACCESS_KEY_ID="real-access-key"
STORAGE_SECRET_ACCESS_KEY="real-secret-key"
STORAGE_PUBLIC_BASE_URL="https://cdn-or-public-bucket-url"
STORAGE_FORCE_PATH_STYLE=false
STORAGE_SIGNED_URL_EXPIRES_SECONDS=300
```

## Website Environment

Set this for the deployed website:

```env
NEXT_PUBLIC_APK_DOWNLOAD_URL="https://your-api-domain.com/uploads/kerala-ayurvedh.apk"
```

## Mobile Environment

Set this before production APK/AAB builds:

```env
EXPO_PUBLIC_API_URL="https://your-api-domain.com"
```

## Release Verification

Run these before sharing a release:

```powershell
cd backend
npx.cmd prisma validate
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test

cd ..\mobile
npm.cmd run typecheck

cd ..\web
npm.cmd run lint
npm.cmd run build
```

Then test on a physical Android phone:

- Install the APK.
- Login as Admin, Manager/Main Pillar/Downline/Customer.
- Place an order.
- Record a handover with the related Order ID.
- Upload proof.
- Confirm receipt/company payment as Admin.
- Verify commission ledger updates.
- Verify customer cannot see Network, Tree, Earnings, or referral code.

## Backup And Monitoring

- Schedule daily PostgreSQL backups.
- Store backups outside the production server.
- Test restore at least once before launch.
- Add uptime checks for `/health`.
- Add log retention for backend errors and admin audit trails.
