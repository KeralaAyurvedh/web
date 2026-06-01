# Load Tests

These k6 scripts exercise the main backend APIs for production readiness.

## Setup

Install k6 locally, then run scripts from this folder or the repository root.

Required environment variables:

- `BASE_URL`: backend URL, for example `http://localhost:4000`
- `USER_PHONE`: active non-admin user phone for login/tree/order flows
- `USER_PASSWORD`: password for `USER_PHONE`
- `ADMIN_PHONE`: active admin phone for admin dashboard flow
- `ADMIN_PASSWORD`: password for `ADMIN_PHONE`
- `PRODUCT_ID`: active product ID for order creation tests
- `CUSTOMER_ID`: customer user ID for order creation tests
- `REFERRAL_CODE`: active sponsor referral code for referral resolution tests

## Run

```powershell
k6 run load-tests/login.js
k6 run load-tests/products.js
k6 run load-tests/mlm-tree.js
k6 run load-tests/referral-signup.js
k6 run load-tests/order-create.js
k6 run load-tests/admin-dashboard.js
```

The default staged profile ramps through 10, 50, 100, and 500 virtual users.
Run the 1000-user spike only against a staging system with production-like database capacity:

```powershell
k6 run load-tests/spike-1000.js
```

## Thresholds

- Request failure rate below 1%
- p95 response time below 2 seconds for normal APIs
- No backend crash, memory leak, database timeout, or duplicate wallet/commission/order records

After any failed load test, inspect backend logs, database CPU/connections, and duplicate commission/order records before increasing traffic.
