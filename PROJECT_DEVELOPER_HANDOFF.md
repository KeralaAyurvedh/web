# Kerala Ayurvedh MLM Product Platform - Developer Handoff

Last updated: May 23, 2026

This document explains the Kerala Ayurvedh product and MLM business platform from scratch. It covers the current architecture, business rules, completed modules, known decisions, solved issues, current risks, and pending development work.

## 1. Project Goal

The project is a Kerala Ayurvedh product business platform with:

- A public website for brand/product presentation.
- A mobile Android app built with Expo React Native.
- A Node.js/Express backend with PostgreSQL and Prisma.
- A Company Admin dashboard inside the mobile app.
- Product catalog, orders, payment handover tracking, commissions, MLM genealogy tree, applications, Help, and system monitoring.

The app is not planned for Play Store initially. The Android app will be shared/downloaded by link, and iOS may be added later.

## 2. Repository Structure

```text
keralaweightlosspowders/
  backend/
    src/
      index.ts
      routes/
      services/
      utils/
      middlewares/
      seed.ts
    prisma/
      schema.prisma
      migrations/
    public/products/
    .env.example
    docker-compose.yml
    package.json

  mobile/
    App.tsx
    index.ts
    assets/
    package.json

  web/
    src/app/
    src/components/
    public/
    package.json

  BUSINESS_RULES_AND_APP_PLAN.txt
  WEB_DIRECTORY_REFERENCE.txt
  PROJECT_DEVELOPER_HANDOFF.md
```

## 3. Tech Stack

Backend:

- Node.js
- Express 5
- TypeScript
- Prisma 7
- PostgreSQL
- JWT authentication
- bcrypt password hashing
- Zod validation
- Brevo SMTP via custom email utility
- Local and S3-style storage abstraction

Mobile:

- Expo React Native
- TypeScript
- React 19
- AsyncStorage for first-time guide state
- Single large `mobile/App.tsx` currently contains screens/components

Website:

- Next.js
- Brand-focused Kerala Ayurvedh public website

Database:

- PostgreSQL
- Prisma schema in `backend/prisma/schema.prisma`

## 4. Main Business Roles

Current roles:

- `ADMIN`
- `MANAGER`
- `BETA_MANAGER`
- `LEVEL_1`
- `LEVEL_2`
- `CUSTOMER`

Role visibility rule:

- Admin sees full system information.
- Non-admin users see only information required for their role.
- Downline users must not see upline private details.
- Customer must not see MLM Tree, Network, or Earnings.

Recently enforced:

- Customer no longer sees Network, MLM Tree, Earnings, or referral code in mobile UI.
- Customer Help only shows customer-relevant information.
- Non-admin Help shows only their own role guide, not all role guides.
- Backend `/users/options` no longer returns sponsor/upline details to non-admin users.
- Backend `/matrix` hides root manager/upline data from beta manager.
- Non-admin Network additions submit `MemberApplication` records instead of creating active users directly.
- Backend `/users` direct active-user creation is Admin-only.
- Non-admin payment handovers select receiver automatically on the backend, so the app does not expose upline receiver details.

## 5. MLM Business Model

### Normal Unilevel Flow

Company/Admin can have any number of Managers.

Normal hierarchy:

```text
Company/Admin
  -> Manager
      -> Level 1
          -> Level 2
              -> Customer
```

Rules:

- Company can create/approve Managers.
- Manager can add Level 1.
- Level 1 can add Level 2.
- Level 2 can add Customers.
- Customer is only a buyer/user and cannot add downline.

### Normal Commission Rules

Commission is fixed per confirmed new person. It is not percentage-based.

Current implemented joining/payment-confirmation commission logic:

- When Manager adds Level 1 and admin confirms payment:
  - Manager gets `1000`.

- When Level 1 adds Level 2 and admin confirms payment:
  - Level 1 gets `1000`.
  - Manager/Beta Manager upline gets `500`.

- When Level 2 adds Customer and admin confirms payment:
  - Level 2 gets `1000`.
  - Level 1 gets nothing.
  - Manager gets nothing in normal flow.

Important:

- Commission is created only after Company Admin confirms payment.
- `commissionProcessedAt` prevents duplicate commission creation.

Implementation:

- `backend/src/services/commissionRules.ts`
- `backend/src/routes/users.ts`
- `backend/src/routes/admin.ts`

### Beta Manager / Matrix Flow

Requirement:

- Each Manager can have only one Beta Manager.
- Beta Manager is directly under the first/root Manager.
- A Manager can add Beta Manager only after completing 216 confirmed customers in normal flow.
- Only confirmed customers are counted for unlocking Beta Manager.
- After one matrix completes, it is the end. No second beta manager/matrix.

Beta matrix structure:

```text
Manager
  -> Beta Manager
      -> Level 1
          -> Level 2
              -> Customer
```

Matrix limits:

- Beta Manager can add Level 1.
- Level 1 can add Level 2.
- Level 2 can add Customers.
- In beta matrix, Level 2 customer count is capped so full matrix becomes 216 customers.

Beta commission:

- When Level 2 adds a Customer in beta matrix and admin confirms payment:
  - Level 2 gets `1000` immediately.
  - `500` is held for the root Manager.
- When beta matrix reaches 216 confirmed customers:
  - Root Manager gets `216 * 500 = 108000`.
  - Matrix status becomes completed.

Implementation:

- `backend/src/services/networkRules.ts`
- `backend/src/services/commissionRules.ts`
- `BetaMatrix` model
- `CommissionLedger` model

## 6. User Creation and Applications

Current state:

- Public/app user can apply for login from the login screen.
- Application collects:
  - Name
  - Phone
  - Email
  - Requested role
  - Sponsor phone when required
  - Aadhaar number
  - PAN number
- Aadhaar/PAN images were removed by decision.
- Only numbers are stored now.
- Admin reviews applications in Company Admin.
- Admin approves/rejects.
- On approval, backend creates the actual user and sends password/login by email if SMTP is configured.

Important production recommendation:

- Non-admin Network "Add downline" creates a `MemberApplication`, not an active user.
- Admin can create users directly if needed.
- Managers/Level 1/Level 2 submit applications only.

Status:

- Application flow exists.
- Direct `/users` active-user creation is Admin-only.
- Non-admin Network screen submits applications for Admin approval.
- Beta Manager applications are supported and approval creates the Beta Matrix.

## 7. Authentication and Security

Implemented:

- Login by phone/password.
- JWT authentication.
- Password hashing with bcrypt.
- `requireAuth` middleware.
- `requireRoles` middleware.
- Admin routes protected.
- Security headers middleware added.
- Login security utility exists.

Admin security:

- Admin routes are mounted under `/admin`.
- `adminRouter.use(requireAuth, requireRoles(Role.ADMIN));`
- Non-admin API calls to admin endpoints return `403`.

Pending:

- Review every non-admin business endpoint for least-privilege access.
- Rate limiting for login and sensitive endpoints should be added.
- Better session expiration/refresh strategy should be finalized.
- Production CORS allowlist should be configured.

## 8. Backend API Modules

Main backend entry:

- `backend/src/index.ts`

Mounted routes:

- `/health`
- `/auth`
- `/users`
- `/products`
- `/orders`
- `/payments`
- `/commissions`
- `/matrix`
- `/applications`
- `/files`
- `/help-topics`
- `/admin`

Important route files:

- `auth.ts`: login/auth.
- `users.ts`: user creation, network, tree, options, payment confirmation.
- `products.ts`: product listing.
- `orders.ts`: order creation/status.
- `payments.ts`: handovers and payment proof upload.
- `commissions.ts`: commission listing.
- `matrix.ts`: beta matrix progress.
- `applications.ts`: public member applications.
- `help.ts`: logged-in Help topics.
- `files.ts`: signed local private file access.
- `admin.ts`: Company Admin dashboard APIs.

## 9. Database Models

Main models:

- `User`
- `Product`
- `ProductStockAdjustment`
- `Order`
- `OrderItem`
- `PaymentHandover`
- `CommissionLedger`
- `BetaMatrix`
- `RoleUpgradeRequest`
- `ReassignmentRequest`
- `MemberApplication`
- `HelpTopic`
- `FileAsset`
- `AuditLog`

Important enum groups:

- Roles and statuses
- Order/payment statuses
- Commission statuses/types
- Application/upgrade/reassignment statuses
- Product availability
- Help topic roles/categories
- File asset categories/providers

## 10. Product Catalog

Product fields implemented:

- Product name
- Category
- Image URL
- Price
- Short description
- Full description
- Usage instructions
- Benefits
- Weight/size
- Stock
- Availability
- Active/inactive

Initial product categories:

- Weight Management
- Digestive Care
- Skin Care

Initial products:

- Kerala Weight Loss Powder
- Gastric Powder
- Skin Allergy Cream

Product image handling:

- Product images can be uploaded by Admin.
- Product images are public.
- Local development stores them under public upload storage.
- Production can use S3-compatible storage.

Stock rule:

- Stock is visible to Company Admin.
- Normal users should not see exact stock.
- Users see availability such as available/out of stock/coming soon.

## 11. Orders and Payments

Current order/payment idea:

- No online payment gateway.
- Payment is manual cash/UPI.
- User/order flow records product quantity and amount.
- Admin/company confirms payment.
- Product movement and handover can be tracked manually.

Payment handover:

- `PaymentHandover` records money movement.
- Statuses:
  - `PENDING`
  - `HANDED_OVER`
  - `RECEIVED`
  - `DISPUTED`
  - `CANCELLED`

Payment proof:

- New private payment proof upload endpoint exists.
- Proofs are stored as private `FileAsset`.
- Admin can request signed view URL.
- Mobile payment screen can pick image/PDF proof files and upload them against a handover.

Pending:

- Payment handover UX needs production review.
- Keep manual payment SOP Help content updated as business rules change.

## 12. Company Admin Dashboard

Admin dashboard exists inside mobile app under Company Admin.

Implemented admin areas include:

- Overview
- Applications
- Users
- Orders
- Payments
- Commissions
- Reports
- Help Manager
- System Monitor
- Matrix
- Audit
- Security
- Products/stock management through product admin sections

Admin can:

- Review applications.
- Approve/reject members.
- Create users through approval.
- Manage products.
- Upload product images.
- Update stock.
- View orders.
- Update order/payment status.
- View/confirm payments.
- Create manual commissions.
- Mark commissions paid.
- View matrix progress.
- View audit logs.
- View system/database monitor.
- Manage Help topics.
- Reset user passwords/security actions.

Admin cannot/should not:

- Create another Admin from app.
- Expose secrets.
- View raw database credentials.
- Trigger destructive DB operations from dashboard.

## 13. System Monitor

Admin-only section:

- `System Monitor`

Backend endpoints:

- `/admin/system/database-stats`
- `/admin/system/storage-stats`
- `/admin/system/health`

Shows:

- Database name and size.
- Storage limit percentage if `DATABASE_STORAGE_LIMIT_MB` is configured.
- PostgreSQL version.
- Active connections.
- Table storage usage.
- Business counts.
- Activity summary.
- Server health.
- Memory usage.
- Node version.
- Upload storage usage.
- Warnings.

Security:

- Admin-only.
- No secrets are returned.
- No DB password, JWT secret, SMTP password, API keys, or private server paths.

## 14. Help System

Two layers exist:

1. Static frontend fallback Help.
2. Dynamic admin-editable Help topics from backend.

Normal Help screen:

- Section name is only `Help`.
- Shows user's own role guide.
- Shows common topics allowed for that role.
- Shows "What should I do now?"
- Has search.
- Has "Show app guide again".

Admin Help Manager:

- Admin-only.
- Can add/edit/deactivate Help topics.
- Can set role:
  - ALL
  - ADMIN
  - MANAGER
  - BETA_MANAGER
  - LEVEL_1
  - LEVEL_2
  - CUSTOMER
- Can set category.
- Can add steps.
- Can add related route.
- Can add video link.
- Can set sort order.

Privacy:

- Non-admin users see active topics for their role or `ALL`.
- Admin category topics are hidden from non-admin in mobile.
- Customer does not see business Help topics.

## 15. First-Time App Guide

Implemented:

- First login on a device shows app guide.
- Uses AsyncStorage.
- Key is per user:
  - `hasSeenFirstTimeGuide:{userId}`
- User can Skip/Finish.
- Help screen can show guide again.
- Guide is role-based.

Customer guide was adjusted so it does not mention Network/Earnings.

## 16. Mobile App UI

Major mobile improvements completed:

- Premium branded Home screen.
- Product-first ecommerce/wellness layout.
- Header with logo/actions.
- Hero carousel.
- Brand intro.
- Category chips.
- Featured products grid.
- Trust/principles cards.
- Wellness highlight section.
- Customer reviews.
- Business quick links moved lower.
- Bottom navigation with 4 tabs.
- More screen.
- Role-based Help.
- Premium MLM Tree screen.
- Admin dashboard sections.
- Role dashboard cards on Home for Admin, Manager, Beta Manager, Level 1, Level 2, and Customer.
- Payment proof upload from the Payments screen.
- Live role dashboard counts from `/users/me/dashboard`.

Bottom navigation:

Business roles:

- Home
- Products
- Network
- More

Customer:

- Home
- Products
- Payments
- More

Customer restrictions:

- No Network tab.
- No MLM Tree menu item.
- No Earnings menu item.
- No referral code display.

## 17. MLM Tree Screen

Implemented:

- Premium tree screen.
- Zoom in/out.
- Fit/center.
- Horizontal/vertical scroll fallback.
- Search.
- Role filters.
- Collapse/expand.
- Legend.
- Detail modal.
- Different node styles by role/status.

Backend:

- Admin sees full tree with company root.
- Non-admin sees only self and downline.
- Customer cannot access tree from UI.

Pending:

- True pinch gesture support can be added later with gesture-handler/reanimated if required.
- Tree virtualization/performance improvements may be needed for very large networks.

## 18. Storage

Production storage abstraction added:

- Local provider for development.
- S3-compatible provider for production.
- Backend-only credentials.
- Mobile never stores storage secrets.

Environment variables:

```env
STORAGE_PROVIDER="local"
LOCAL_UPLOAD_DIR="public"
LOCAL_PRIVATE_UPLOAD_DIR="private-uploads"
STORAGE_BUCKET=""
STORAGE_REGION="us-east-1"
STORAGE_ENDPOINT=""
STORAGE_ACCESS_KEY_ID=""
STORAGE_SECRET_ACCESS_KEY=""
STORAGE_PUBLIC_BASE_URL=""
STORAGE_FORCE_PATH_STYLE=false
STORAGE_SIGNED_URL_EXPIRES_SECONDS=300
```

File categories:

- `PRODUCT_IMAGE`
- `AADHAAR_IMAGE`
- `PAN_IMAGE`
- `PAYMENT_PROOF`
- `OTHER`

Current decision:

- Aadhaar/PAN image upload removed.
- Product images are public.
- Payment proofs are private.
- Sensitive private files are accessed through signed URLs.

Implementation:

- `backend/src/services/storage.ts`
- `backend/src/routes/files.ts`
- `FileAsset` model

## 19. Email / Brevo SMTP

Implemented:

- SMTP config support.
- Brevo SMTP can be used.
- Login credentials email after admin approval.
- Support email config.
- SMTP password stays only in backend `.env`.

Important `.env` fields:

```env
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM_EMAIL=""
SMTP_FROM_NAME="Kerala Ayurvedh"
SUPPORT_EMAIL=""
```

Notes:

- Port 587 normally uses STARTTLS, so `SMTP_SECURE=false`.
- Port 465 normally uses implicit TLS, so `SMTP_SECURE=true`.
- Never put SMTP credentials in mobile app.
- Never commit `.env`.

## 20. Website

Website exists under `web/`.

Purpose:

- Public Kerala Ayurvedh homepage.
- Product/brand presentation.
- App link/download can be added.
- Login/product view buttons should redirect to app link, not handle product purchase on website.

Important rule:

- Website does not allow buying products without login.
- Product purchase/order happens inside app after login.

Pending:

- Production deployment and domain setup.
- Public website route buttons should be reviewed again after the production domain is selected.
- Set `NEXT_PUBLIC_APK_DOWNLOAD_URL` for the production APK URL.

## 21. Environment and Setup

Backend local setup:

```powershell
cd C:\Users\LENOVO\Desktop\keralaweightlosspowders\backend
npm.cmd install
npx.cmd prisma migrate dev
npx.cmd prisma generate
npm.cmd run seed
npm.cmd run dev
```

Mobile local setup:

```powershell
cd C:\Users\LENOVO\Desktop\keralaweightlosspowders\mobile
npm.cmd install
npx.cmd expo start
```

Expo Android testing:

- Use Expo Go on mobile.
- Backend must be reachable from mobile using LAN IP, not `localhost`.
- API URL in mobile must point to the computer LAN IP.

Docker:

- Docker is used mainly to run PostgreSQL consistently.
- It reduces setup mismatch problems.
- It does not automatically solve every production issue, but it helps avoid local DB installation/config problems.

## 22. Issues Faced and Resolved

### Database Connection Error

Issue:

- Prisma error `P1001: Can't reach database server at localhost:5432`.

Cause:

- PostgreSQL was not running or not reachable.

Resolution:

- Used Docker/PostgreSQL setup.
- Confirmed database sync.

### TypeScript `process` Error in Seed

Issue:

- `Cannot find name 'process'`.

Cause:

- Node type definitions/config missing.

Resolution:

- Backend TypeScript config/package setup updated to include Node types.

### Expo Mobile Network Request Failed

Issue:

- Mobile app showed `Network request failed`.

Cause:

- Mobile cannot use backend `localhost`; it needs computer LAN IP.

Resolution:

- Explained LAN IP usage and backend binding to `0.0.0.0`.

### Android SDK / adb Missing

Issue:

- Expo/Android emulator command failed because Android SDK/adb not installed.

Resolution:

- Switched to Expo Go mobile testing path.

### Expo Remote Update Failed

Issue:

- Expo showed `Failed to download remote update`.

Likely causes:

- Network/cached stale QR/dev server mismatch.

Resolution:

- Restarted Expo with fresh QR and checked mobile/backend connectivity.

### Product Catalog Errors

Issue:

- Product catalog/admin features needed clearer product fields and image handling.

Resolution:

- Added product fields, categories, stock, availability, admin management, and image upload support.

### Aadhaar/PAN Storage Concern

Issue:

- Aadhaar/PAN image uploads would consume storage and increase sensitive data risk.

Resolution:

- Removed Aadhaar/PAN image upload fields.
- Kept only Aadhaar/PAN numbers.
- Added migration to remove image URL columns.

### SMTP Safety

Issue:

- Needed Brevo SMTP integration without exposing credentials.

Resolution:

- SMTP config kept in backend `.env`.
- `.env` ignored.
- `.env.example` safe.
- Mobile never stores SMTP password.

### Prisma Migration Drift

Issue:

- Error `P3006`, `P3018`, relation `MemberApplication` does not exist.
- Later drift detected because DB had schema changes created by `db push`/manual sync but migrations did not record them.

Resolution:

- Added missing `MemberApplication` migration.
- Added missing `ProductStockAdjustment` migration.
- Made migrations idempotent where needed.
- Marked already-existing migrations as applied.
- Dropped old Aadhaar/PAN image columns only.
- Applied remaining migrations successfully.

### Customer Role Showing Business Items

Issue:

- Customer could see Network/MLM Tree/Earnings in navigation/help.

Resolution:

- Added role-based tab access.
- Customer bottom nav changed to Home/Products/Payments/More.
- Customer Help and profile cleaned.

### Upline Privacy Concern

Issue:

- Downline users should not see upline names/details.

Resolution:

- Backend `/users/options` no longer sends sponsor/upline to non-admin.
- Backend `/matrix` hides root manager details from beta manager.
- Admin still sees full data.

## 23. Current Known Risks / Things To Watch

1. `mobile/App.tsx` is very large.
   - It works, but should later be split into screens/components/services.

2. Non-admin direct active-user creation is blocked.
   - Non-admin "Add downline" submits applications for Admin approval.
   - Continue watching related APIs for least-privilege behavior.

3. Payment proof upload and Admin proof viewing exist.
   - Admin can request a signed proof URL from the payment queue.
   - Payment handover UX may still need business SOP polish.

4. Pinch zoom is not implemented with gesture-handler.
   - Current tree uses scroll and button zoom fallback.

5. Production deployment is not finalized.
   - Need server, domain, SSL, DB backup, storage bucket, app download hosting.

6. App binary/download flow is complete for the current debug APK release.
   - Future release work should define APK/AAB versioning and update strategy.

7. Backend endpoint permissions should receive final audit.
   - Especially orders, payments, network, commission visibility.

8. Automated tests now exist for core backend MLM and commission flows.
   - Permission-focused API tests should continue to expand.

## 24. Completed Development Checklist

Completed:

- Backend base Express/Prisma/PostgreSQL setup.
- Docker PostgreSQL setup.
- Auth/login.
- Role model.
- User/network model.
- MLM normal commission logic.
- Beta matrix unlock/hold/completion logic.
- Product catalog.
- Product admin management.
- Stock and availability.
- Orders.
- Manual payment handover tracking.
- Commission ledger.
- Admin dashboard.
- System monitor.
- Help screen.
- Admin Help Manager.
- First-time app guide.
- Premium Home redesign.
- Premium MLM Tree redesign.
- Bottom navigation.
- More screen.
- Role-based UI visibility.
- Customer restricted UI.
- Upline privacy improvements.
- SMTP/Brevo support.
- Aadhaar/PAN image upload removal.
- Production storage abstraction.
- Product image upload through storage service.
- Private payment proof storage backend.
- Mobile payment proof upload.
- Admin private payment proof preview/download action.
- Non-admin application-based downline submission.
- Admin-only direct active-user creation.
- Role dashboard summaries with live counts.
- Login/change-password/application rate limiting.
- Production CORS allowlist parsing.
- Non-admin payment handover order-ownership check.
- Low-stock alerts in Admin overview.
- Audit logging for important admin actions.
- Prisma migrations fixed and synced.
- TypeScript checks passing after recent work.

## 25. Pending Development Checklist

High priority:

- Final backend permission audit for every non-admin API.
- Improve payment/order status screens for each role.
- Continue admin stock workflow polish.
- Add production backup strategy.
- Add production deployment setup.

Medium priority:

- Split `mobile/App.tsx` into maintainable files.
- Expand automated backend tests for commission and network edge cases.
- Add API integration tests for role permissions.
- Add better app support/contact details.
- Keep support communication email-only unless business policy changes.
- Add production logging and monitoring.
- Add stronger password policy and forgot password flow.

Later:

- iOS support.
- Push notifications.
- App update strategy.
- App Store/Play Store release if business decides.
- Admin-editable banners/reviews/home content.
- Advanced reports/export.
- Proper backup monitor.

## 26. Recommended Next Development Steps

Recommended order:

1. Continue backend authorization audit, especially order/payment visibility edge cases.
2. Improve payment/order status screens for each role.
3. Expand automated tests for role permissions.
4. Split mobile app into multiple files.
5. Add low-stock alert workflow polish.
6. Prepare production backup/deployment checklist.
7. Define future APK/AAB versioning and update strategy.

## 27. Commands For Verification

Backend:

```powershell
cd C:\Users\LENOVO\Desktop\keralaweightlosspowders\backend
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate dev
npm.cmd run test
npm.cmd run typecheck
npm.cmd run build
```

Mobile:

```powershell
cd C:\Users\LENOVO\Desktop\keralaweightlosspowders\mobile
npm.cmd run typecheck
npx.cmd expo export --platform android
```

If Expo export fails with Hermes permission in sandbox, run with normal system permission or from your terminal.

## 28. Important Production Rules

- Never commit `.env`.
- Never store SMTP password in mobile app.
- Never store storage/S3 secret keys in mobile app.
- Admin-only APIs must be protected by backend, not only hidden in UI.
- Non-admin users must never receive upline private data.
- Customer must never see Network/Tree/Earnings.
- Product images can be public.
- Payment proof files must be private.
- Aadhaar/PAN images are not collected.
- Commission should be created only after company/admin payment confirmation.
- Beta Manager unlock requires 216 confirmed normal customers.
- One Manager can have only one Beta Manager/matrix.
