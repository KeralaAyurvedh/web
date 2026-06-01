# Kerala Ayurvedh Website

Public Next.js website for Kerala Ayurvedh product presentation and Android app download.

## Purpose

- Present the Kerala Ayurvedh brand and product story.
- Send customers and members to the Android app for login, ordering, payments, and network activity.
- Serve as a public marketing site only. MLM logic, ordering, payment tracking, commissions, and admin work happen in the mobile app and backend.

## Setup

```bash
cd web
npm install
npm run dev
```

Production build:

```bash
cd web
npm run build
npm run start
```

## Android App Download

The website download button uses this URL by default:

```text
/uploads/kerala-ayurvedh.apk
```

The APK file is stored at:

```text
backend/public/kerala-ayurvedh.apk
```

To override the download URL for production, set:

```env
NEXT_PUBLIC_APK_DOWNLOAD_URL="https://your-domain.com/uploads/kerala-ayurvedh.apk"
NEXT_PUBLIC_API_URL="https://your-api-domain.com"
```

## Verification

```bash
cd web
npm run lint
npm run type-check
npm test
npm run build
```
