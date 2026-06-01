# Kerala Ayurvedh Android App

Expo mobile app for Kerala Ayurvedh distributors, customers, products, orders, payments, and MLM commissions.

## Backend URL

The app reads the backend URL from `EXPO_PUBLIC_API_URL`. If it is not set, it falls back to local development:

```text
http://localhost:4000
```

For a physical Android phone, set the URL to your computer LAN IP, for example:

```text
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000
```

For production APK builds, set it to the deployed backend HTTPS URL.

## Run

```bash
npm install
npm run type-check
npm run android
```

Make sure the backend is running first:

```bash
cd ..\backend
npm run dev
```

## Build

```bash
set EXPO_PUBLIC_API_URL=https://your-api-domain.com
npx expo prebuild --platform android
cd android
gradlew assembleDebug
```
