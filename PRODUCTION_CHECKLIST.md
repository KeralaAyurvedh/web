# Production Checklist

## Environment

- Copy `backend/.env.example`, `web/.env.example`, and `mobile/.env.example`.
- Set strong production values for `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`, and `EXPO_PUBLIC_API_URL`.
- Keep `ALLOW_TEST_DATA_RESET=false` in production.
- Configure SMTP, storage, backup directory, and persistent upload paths before launch.
- Never commit real `.env` files or service-role storage keys.

## Build And Test

```powershell
cd backend
npm install
npm run prisma:generate
set TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kerala_ayurvedh_test
npm run type-check
npm test
npm run build

cd ..\web
npm install
npm run lint
npm run type-check
npm run build

cd ..\mobile
npm install
npm run type-check
```

## Database

- Run `prisma migrate deploy` against staging first, then production.
- Confirm the commission idempotency migration succeeds before allowing payment confirmations.
- Verify indexes exist for referral code, sponsor, order status/user, commission receiver/source/order, product active/category, and dashboard date fields.
- Use pagination/level-wise loading for large downlines before exposing accounts with very large trees.

## Load Testing

Run k6 scripts against staging with production-like database size:

```powershell
k6 run load-tests/login.js
k6 run load-tests/products.js
k6 run load-tests/mlm-tree.js
k6 run load-tests/referral-signup.js
k6 run load-tests/order-create.js
k6 run load-tests/admin-dashboard.js
```

Run `load-tests/spike-1000.js` only after the 500-user stage is stable.

## Security

- Login, password reset, and referral resolution must remain rate limited.
- Admin APIs must require `ADMIN`; user APIs must enforce owner/downline scope.
- Wallet, commission, order totals, product price, stock, role, and sponsor placement must be computed server-side only.
- File upload endpoints must validate MIME type and size.
- Production CORS must be an explicit HTTPS allowlist.
- `/health/ready` must return healthy before deployment promotion.

## Deployment

- Backend must listen on `process.env.PORT` and `0.0.0.0`.
- Run migrations before starting the backend release.
- Use HTTPS for public backend and web domains.
- Configure persistent storage or object storage for uploads.
- Configure backup and restore scripts and test a restore before launch.

## Monitoring

- Add external uptime checks for `/health` and `/health/ready`.
- Forward backend logs to the hosting provider log drain.
- Add Sentry or equivalent before real users if the hosting platform does not provide error aggregation.
- Monitor database CPU, connection count, lock waits, and slow queries during launch.

## Rollback And Backup

- Keep the previous backend/web/mobile build available for rollback.
- Take a database backup immediately before production migrations.
- If a migration fails, stop traffic, restore from backup, and redeploy the previous build.
- For payment/commission incidents, freeze admin payment confirmation until duplicate records and balances are audited.

## Final Launch Gate

- Staging smoke tests pass.
- Backend type-check, tests, and build pass.
- Web lint, type-check, and build pass.
- Mobile type-check passes and production APK points to the HTTPS backend.
- k6 10/50/100-user stages pass; 500-user stage passes before a large public launch.
- Admin confirms there are no test users/orders/commissions in production data.
