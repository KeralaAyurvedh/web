# Kerala Ayurvedh MLM Product Platform - Current Status

Last updated: May 23, 2026

This document summarizes what has been completed so far in the Kerala Ayurvedh product and MLM platform, what is partially complete, and what still needs to be finished before production use.

## 1. Project Overview

The platform is being built for Kerala Ayurvedh product sales and MLM/distributor operations.

The system currently includes:

- A public marketing website under `web/`.
- An Expo React Native Android app under `mobile/`.
- A Node.js/Express backend under `backend/`.
- PostgreSQL database access through Prisma.
- Company Admin functionality inside the mobile app.
- Product catalog, orders, manual payment tracking, commissions, MLM tree, Beta Matrix, applications, Help, storage, and system monitoring.

The planned first release is Android-first. The app is expected to be shared by APK/download link, not initially through Play Store. iOS can be considered later.

## 2. Completed Backend Work

### Backend Foundation

Completed:

- Node.js/Express backend created.
- TypeScript configured.
- Prisma configured.
- PostgreSQL database schema created.
- Docker Compose support added for local PostgreSQL.
- Health route added.
- Central backend config added.
- Backend binds to `0.0.0.0` so Expo/mobile devices can reach it over LAN.
- Graceful shutdown added for Prisma disconnect.
- JSON body size controlled by config.
- Public uploads served from backend.

Verification:

- `npx.cmd prisma validate` passes.
- `npm.cmd run typecheck` passes.
- `npm.cmd run build` passes.

### Authentication and Security

Completed:

- Login by phone and password.
- JWT authentication.
- Password hashing with bcrypt.
- `requireAuth` middleware.
- `requireRoles` middleware.
- Admin routes protected with Admin-only middleware.
- Security headers middleware.
- Change password endpoint.
- Failed login tracking utility.
- Login rate limiting.
- Change-password rate limiting.
- Application submission/status rate limiting.
- Production JWT safety checks.
- Production CORS allowlist parsing through comma-separated `CORS_ORIGIN`.

Still left:

- Forgot password flow.
- Stronger password policy rules.
- Refresh-token/session strategy.
- Persistent/distributed rate limiting for production multi-instance deployments.

### User and Role System

Completed roles:

- `ADMIN`
- `MANAGER`
- `BETA_MANAGER`
- `LEVEL_1`
- `LEVEL_2`
- `CUSTOMER`

Completed:

- User model with role, status, sponsor, placement type, referral code, and payment confirmation fields.
- Admin can create active users directly.
- Non-admin direct active-user creation is blocked.
- Non-admin downline creation now submits `MemberApplication`.
- Admin can approve/reject applications.
- Admin approval creates the real user.
- Login credentials can be emailed after approval if SMTP is configured.
- Admin cannot create another Admin from the app.
- Customer is restricted from Network, MLM Tree, Earnings, and referral-code display in mobile UI.

Still left:

- More automated permission tests around every user/network endpoint.
- Production duplicate-account dispute workflow.

### MLM Network Rules

Completed:

- Normal hierarchy:

```text
Company/Admin
  -> Manager
      -> Level 1
          -> Level 2
              -> Customer
```

- Beta Matrix hierarchy:

```text
Manager
  -> Beta Manager
      -> Level 1
          -> Level 2
              -> Customer
```

- Manager/Beta Manager can add Level 1.
- Level 1 can add Level 2.
- Level 2 can add Customer.
- Customer cannot add downline.
- Manager can have max 6 Level 1 users.
- Level 1 can have max 6 Level 2 users.
- Beta Matrix Level 2 customer count is capped.
- Inactive sponsors cannot add downline.
- Manager must complete 216 confirmed normal customers before Beta Manager creation.
- Each Manager can have only one Beta Manager/matrix.
- No second matrix after completion.

Still left:

- More integration tests for edge cases.
- Business confirmation whether normal Level 2 customers should remain unlimited outside Beta Matrix.

### Commission System

Completed:

- Fixed commission logic, not percentage-based.
- Commission generated only after Company/Admin confirms payment.
- `commissionProcessedAt` prevents duplicate commission creation.
- Normal commission rules implemented:
  - Manager adds Level 1: Manager gets `1000`.
  - Level 1 adds Level 2: Level 1 gets `1000`, Manager/Beta Manager gets `500`.
  - Level 2 adds Customer: Level 2 gets `1000`.
- Beta Matrix commission rules implemented:
  - Beta Level 2 adds Customer: Level 2 gets `1000`.
  - Root Manager gets `500` held as pending.
  - On 216 confirmed Beta Matrix customers, root Manager gets `108000`.
  - Matrix status becomes completed.
- Admin can create manual commission adjustments.
- Admin can mark commissions paid.
- Commission ledger model exists.

Still left:

- Automated commission and Beta Matrix integration tests exist; keep expanding edge-case coverage as rules evolve.
- Payout export/reporting polish.
- Clear business SOP for when Admin should mark commissions paid.

### Product Catalog and Stock

Completed:

- Product model supports:
  - Name
  - Category
  - Price
  - Image URL
  - Short description
  - Full description
  - Usage instructions
  - Benefits
  - Size/weight
  - Stock
  - Availability
  - Active/inactive
- Initial product categories defined:
  - Weight Management
  - Digestive Care
  - Skin Care
- Initial products seeded/planned:
  - Kerala Weight Loss Powder
  - Gastric Powder
  - Skin Allergy Cream
- Admin product management.
- Product image upload.
- Product images stored through storage service.
- Public users do not see exact stock.
- Admin sees stock.
- Low-stock alerts added to Admin overview.
- Stock adjustment model and workflow added.
- Product delete is soft/inactive, not hard delete.

Still left:

- Admin stock workflow polish.
- Stock movement/delivery tracking polish.
- Final product images and real product copy.

### Orders

Completed:

- Order model.
- Order item model.
- Authenticated product order creation.
- Customer must be a Customer user.
- Customer, their Level 2 sponsor, or Admin can create customer order.
- Product stock decreases when order is created.
- Admin can update order status.
- Admin cancellation restores stock.
- Admin can confirm company payment for an order.

Still left:

- Better role-specific order screens.
- Product transfer/delivery workflow needs final polish.
- Clear manual order/payment SOP should be added to Help.

### Payment Handovers and Proof Files

Completed:

- Manual payment handover model.
- Handover statuses:
  - `PENDING`
  - `HANDED_OVER`
  - `RECEIVED`
  - `DISPUTED`
  - `CANCELLED`
- Non-admin receiver is selected automatically by backend.
- Non-admin users do not need to see/select upline receiver details.
- Non-admin payment handover now checks order ownership before allowing an order id.
- Payment proof upload endpoint.
- Proof files can be image or PDF.
- Proof size limit added.
- Payment proof stored as private `FileAsset`.
- Admin payment queue returns proof metadata.
- Admin can request signed private proof view URL.
- Mobile Admin UI includes “View proof”.
- Normal payment screen can upload proof.

Still left:

- More polished payment/order status screens per role.
- Written business SOP for cash/UPI handover.
- Production storage bucket setup.

### Applications

Completed:

- Public/app member application submission.
- Application fields:
  - Name
  - Phone
  - Email
  - Requested role
  - Sponsor phone when required
  - Aadhaar number
  - PAN number
- Aadhaar/PAN image upload removed by decision.
- Only Aadhaar/PAN numbers are stored.
- Duplicate pending application checks.
- Duplicate existing user checks.
- Admin application review.
- Admin approve/reject.
- Approval creates actual user.
- Beta Manager application approval creates Beta Matrix.

Still left:

- Production-grade privacy policy and consent text for Aadhaar/PAN number collection.
- Optional application status notifications.

### Help System

Completed:

- Static fallback Help in mobile app.
- Dynamic Help topics in backend.
- Admin Help Manager.
- Help topics can be role-specific.
- Help topics can be category-specific.
- Help supports:
  - Title
  - Short description
  - Content
  - Steps
  - Related route
  - Video URL
  - Sort order
  - Active/inactive
- Normal users see only their own role/common topics.
- Admin category hidden from non-admin.
- Customer Help does not show business topics.

Still left:

- Final Help/SOP content is seeded for the current release.
- Add real support contact details when the business confirms them.
- Support is email-only in the app.

### System Monitor and Audit

Completed:

- Admin-only system monitor.
- Database stats endpoint.
- Storage stats endpoint.
- Health endpoint.
- Shows database size, PostgreSQL version, connection count, table usage, business counts, memory, Node version, and warnings.
- Secrets are not returned.
- Audit log model.
- Audit logs for important admin actions.

Still left:

- Production logging.
- External monitoring/alerts.
- Backup monitor.

### Storage

Completed:

- Storage abstraction.
- Local storage for development.
- Cloudflare R2 storage support for production.
- Product images public.
- Payment proofs private.
- Signed URL support for private files.
- Backend-only storage credentials.
- Mobile never stores storage secrets.

Still left:

- Configure real production Cloudflare R2 bucket.
- Configure backup/retention policy.
- Decide CDN/public image hosting setup.

### Email / SMTP

Completed:

- SMTP config support.
- Brevo SMTP-compatible settings.
- Login credentials email after admin approval if SMTP is configured.
- SMTP credentials remain backend-only.
- `.env.example` contains safe placeholders.

Still left:

- Configure real Brevo account credentials in production `.env`.
- Test deliverability.
- Add forgot-password email flow.

## 3. Completed Mobile App Work

### Mobile Foundation

Completed:

- Expo React Native app.
- TypeScript configured.
- Backend API calls through `API_URL`.
- Expo Document Picker added for payment proof files.
- Expo FileSystem used for base64 proof upload.
- AsyncStorage used for first-time guide state.

Verification:

- `npm.cmd run typecheck` passes.

Still left:

- Replace hardcoded API URL with environment/config-based setup.
- Split large `mobile/App.tsx` into multiple files.
- Android APK build/download flow is complete for the current debug APK release.

### Authentication and First-Time Guide

Completed:

- Login screen.
- Application form from login flow.
- Application status lookup.
- Role-based first-time guide.
- Guide state stored per user:

```text
hasSeenFirstTimeGuide:{userId}
```

- User can skip/finish guide.
- Help screen can show guide again.
- Customer guide avoids Network/Earnings references.

Still left:

- Forgot password UI.
- Better session persistence/refresh strategy.

### Mobile Navigation and Role Visibility

Completed:

- Bottom navigation.
- More screen.
- Role-based tab access.
- Business-role tabs:
  - Home
  - Products
  - Network
  - More
- Customer tabs:
  - Home
  - Products
  - Payments
  - More
- Customer cannot access:
  - Network
  - MLM Tree
  - Earnings
  - Referral code display

Still left:

- More navigation polish after app is split into screens.

### Home and Dashboard

Completed:

- Premium product-first Home screen.
- Logo/header/actions.
- Hero carousel.
- Brand intro.
- Category chips.
- Featured products grid.
- Trust/principles cards.
- Wellness highlight section.
- Customer reviews.
- Business quick links moved lower.
- Role dashboard cards.
- Live role dashboard counts from backend.
- Beta Matrix progress section for Admin/Manager/Beta Manager.

Still left:

- Admin-editable banners/reviews/home content.
- Final real customer reviews if business wants them.

### Products

Completed:

- Product catalog screen.
- Product detail view.
- Product availability display.
- Admin product creation/editing.
- Admin stock adjustment.
- Admin image upload support through backend.

Still left:

- Final image assets.
- Product detail design polish if needed.

### Network and MLM Tree

Completed:

- Non-admin Network add submits application, not active user.
- Admin can create active users.
- Premium MLM Tree screen.
- Tree search.
- Role filters.
- Collapse/expand.
- Zoom buttons.
- Fit/center.
- Horizontal/vertical scroll fallback.
- Legend.
- Detail modal.
- Different node styles by role/status.
- Admin sees full tree.
- Non-admin sees self/downline only.
- Customer has no tree UI access.

Still left:

- True pinch zoom using gesture-handler/reanimated.
- Tree virtualization/performance for very large networks.

### Payments

Completed:

- Payment handover list.
- Record handover.
- Non-admin receiver hidden and backend-selected.
- Upload proof for handover.
- Admin company payment confirmation from mobile.
- Admin order payment confirmation from mobile.
- Admin payment queue.
- Admin can mark payment handover received/disputed/cancelled.
- Admin can view uploaded private payment proof through signed URL.

Still left:

- Better role-specific payment/order status UX.
- Clear handover SOP inside Help.

### Admin Dashboard

Completed Admin sections:

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
- Product/stock management

Completed Admin actions:

- Review applications.
- Approve/reject applications.
- Create users through approval.
- Manage products.
- Upload product images.
- Adjust stock.
- View orders.
- Update order/payment status.
- Confirm joining/company payment.
- Confirm order company payment.
- View payment handovers.
- View private payment proof.
- Create manual commissions.
- Mark commissions paid.
- View matrix progress.
- View reports.
- View audit logs.
- View system monitor.
- Manage Help topics.
- Reset user passwords.
- Change own password.
- See low-stock alerts.

Still left:

- More refined Admin UX after splitting files.
- Export reports.
- Advanced analytics.

## 4. Completed Website Work

Completed:

- Next.js public marketing website exists.
- Kerala Ayurvedh brand homepage.
- Hero slideshow.
- Product/brand sections.
- Reviews section.
- Support/footer sections.
- App download section points to the generated Android APK.
- Login/product/buy actions are planned to guide users to app download/open flow rather than web purchase.

Important current direction:

- Website is public marketing only.
- Product purchase/order happens inside the mobile app after login.
- Website should not run MLM logic, distributor dashboard, cart, checkout, commission calculation, or payment collection.

Still left:

- Production domain/deployment.
- Review public route buttons again after the production domain is selected.
- Keep `NEXT_PUBLIC_APK_DOWNLOAD_URL` updated for production hosting.

## 5. Completed Database Work

Completed main models:

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

Completed enum groups:

- Roles
- User statuses
- Placement types
- Order statuses
- Payment statuses
- Commission statuses/types
- Application statuses
- Upgrade/reassignment statuses
- Product availability
- Stock adjustment types
- Help topic roles/categories
- File asset categories/providers

Completed migration work:

- Initial schema migration.
- Product catalog details migration.
- Admin panel controls migration.
- Product stock adjustment migration.
- Member application migration.
- Removed Aadhaar/PAN image columns.
- Help topics migration.
- File asset/storage migration.
- Prisma migration drift was resolved.

Still left:

- DB backup strategy.
- Production migration process.
- Automated restore testing.

## 6. Completed Privacy and Visibility Rules

Completed:

- Admin sees full system information.
- Non-admin users see only role-required information.
- Customer does not see Network/MLM Tree/Earnings/referral code.
- Customer Help does not show business topics.
- Non-admin Help shows only relevant guide/topics.
- `/users/options` does not expose broad sponsor/upline data to non-admin.
- `/matrix` hides root manager details from Beta Manager.
- Non-admin payment handover receiver is backend-selected.
- Payment proof files are private.
- Storage/R2 secrets are backend-only.
- SMTP password is backend-only.
- `.env` should not be committed.

Still left:

- Full endpoint-by-endpoint authorization test suite.
- Production privacy/legal review for Aadhaar/PAN number collection.

## 7. Current Remaining High-Priority Work

These are the most important next tasks before production:

1. Final backend permission audit

Review every non-admin endpoint for:

- Who can call it.
- What rows they can read.
- What rows they can mutate.
- Whether private upline/downline data leaks.
- Whether customer access is blocked where needed.

Priority endpoints:

- Orders
- Payments
- Users/network
- Tree
- Commissions
- Applications
- Files

2. Automated tests and permission coverage

Existing backend integration tests cover core commission and Beta Matrix scenarios. Continue adding tests for:

- Normal commission rules.
- Beta Manager unlock rule.
- Beta Matrix completion rule.
- Duplicate commission prevention.
- Non-admin cannot create active users.
- Customer cannot access business endpoints.
- Non-admin cannot view unrelated orders/payments.
- Admin-only routes return `403` for non-admin.

3. Payment/order role UX polish

Improve screens so each role clearly sees:

- What payment they need to give/receive.
- Current handover status.
- Current order status.
- Whether company has confirmed payment.
- Whether product has been released/delivered.

4. Production deployment setup

Prepare:

- Backend hosting.
- PostgreSQL production DB.
- Domain.
- SSL.
- Environment variables.
- CORS allowlist.
- Storage bucket.
- SMTP credentials.
- Logs/monitoring.
- Backup and restore process.
- Version/update process for future APK releases.

## 8. Medium-Priority Work

Still left:

- Split `mobile/App.tsx` into screens/components/services.
- Add production logging.
- Add stronger password policy.
- Add forgot password flow.
- Add real support contact details.
- Keep support communication email-only unless business policy changes.
- Add report export.
- Add advanced reports.
- Improve stock workflow.
- Replace stale website docs.
- Improve website SEO/accessibility.

## 9. Later Work

Future options:

- iOS support.
- Push notifications.
- App update strategy.
- App Store/Play Store release if business decides.
- Admin-editable homepage banners/reviews.
- Advanced reporting/export.
- Proper backup monitor.
- Larger tree performance optimization.
- Pinch zoom with gesture-handler/reanimated.

## 10. Current Verification Commands

Backend:

```powershell
cd C:\Users\LENOVO\Desktop\keralaweightlosspowders\backend
npx.cmd prisma validate
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test
```

Mobile:

```powershell
cd C:\Users\LENOVO\Desktop\keralaweightlosspowders\mobile
npm.cmd run typecheck
```

Optional mobile export:

```powershell
cd C:\Users\LENOVO\Desktop\keralaweightlosspowders\mobile
npx.cmd expo export --platform android
```

If Expo export fails because of filesystem/Hermes permission restrictions, run it from a normal terminal.

## 11. Production Safety Rules

Before production:

- Never commit `.env`.
- Never place SMTP password in mobile app.
- Never place R2/storage secret keys in mobile app.
- Change `JWT_SECRET`.
- Configure production CORS allowlist.
- Configure real database backups.
- Configure real storage bucket.
- Configure SMTP credentials only in backend environment.
- Confirm Aadhaar/PAN number collection policy.
- Confirm payment handover SOP.
- Confirm support contact details.
- Test commission flows with real scenarios.
- Test Admin and non-admin permissions.
- Test Android APK on physical devices.

## 12. Summary

The platform is now functionally broad: backend, database, mobile app, Admin dashboard, products, orders, payment handovers, proof uploads, private files, commissions, Beta Matrix, applications, Help, audit logs, storage, and monitoring are all in place.

The biggest remaining work is not basic feature creation. It is production hardening:

- Permission audit.
- Expanded permission tests.
- Payment/order UX polish.
- Production deployment.
- Backup/storage/email setup.
- Production APK version/update process.
- Splitting the large mobile app file for maintainability.
