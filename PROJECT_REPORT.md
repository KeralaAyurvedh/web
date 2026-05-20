# Kerala Weight Loss Powders — Project Report

## Overview

This document summarizes the project structure, technology stack, work completed so far, issues encountered during setup and development, temporary fixes applied, and recommended next steps to fully run and deploy the application.

## Project Structure

Top-level folders:
- backend: Node/Express/TypeScript backend with Prisma for DB access.
- web: Next.js (React) frontend using Next 16 and React 19.
- mobile: mobile app sources (not covered here).

Relevant backend files:
- backend/src/index.ts — Express app entry, exposes API routes and `/health` endpoint.
- backend/prisma/schema.prisma — Prisma schema (models and enums).
- backend/prisma.config.ts — Prisma v7 config file (holds datasource url).
- backend/src/utils/prisma.ts — Prisma client wrapper (edited during setup).
- backend/src/routes/* — API route handlers (auth, mlm, products).

Relevant frontend files:
- web/package.json — Next.js start/dev scripts.
- web/src/app/page.tsx — main page (user was viewing this file).

## Technology Stack

- Frontend: Next.js 16 (Turbopack), React 19, TailwindCSS (v4), TypeScript.
- Backend: Node.js, Express, TypeScript, Prisma v7, ts-node, nodemon.
- Database: Prisma is configured for PostgreSQL (datasource in prisma.config.ts), but a database connection was not provided during local setup.
- Auth & Utilities: jsonwebtoken, bcryptjs, razorpay (for payments integration), axios on frontend.

## What we completed (actions performed during this session)

- Inspected `package.json` files and start scripts for `backend` and `web`.
- Installed npm dependencies for both `backend` and `web`.
- Ran the frontend dev server:
  - Next dev started successfully. Local: http://localhost:3000, Network IP available.
- Attempted to start the backend using `nodemon` + `ts-node` and iteratively fixed several startup blockers enough to continue development (see "Changes made").
- Ran `npx prisma generate` to produce the Prisma client (required Prisma changes applied first).
- Created this detailed project report file: [PROJECT_REPORT.md](PROJECT_REPORT.md)

## Issues encountered (detailed)

1. Missing start script in `backend/package.json`
   - `backend/package.json` did not include a `dev` or `start` script to run TypeScript via `ts-node` or `nodemon`.
   - Action taken: Started the backend manually with `npx nodemon --watch src --exec "ts-node src/index.ts"`.

2. TypeScript compile-time errors on backend startup
   - Errors observed:
     - Cannot find module `uuid` or its type declarations.
     - `@prisma/client` type exports like `Role` and `PrismaClient` were not found in the same way as older Prisma versions.
     - Prisma v7 enforces a different configuration model (datasource URL is moved out of schema file into `prisma.config.ts`). Running `npx prisma generate` initially failed due to `url` presence in `schema.prisma`.
   - Root causes:
     - Missing dependency `uuid` and `@types/uuid` before initial run.
     - Prisma v7 introduces breaking changes compared to v2/v3; code in the repo referenced enum types (e.g., `Role`) from `@prisma/client` in a way that collides with the generated client shape in v7.
     - `PrismaClient` in v7 needs to be constructed with valid `PrismaClientOptions` (adapter or other options) instead of a simple `new PrismaClient()` with a `url` in schema.

3. Prisma schema vs. prisma.config mismatch
   - `prisma/schema.prisma` included a `datasource db { url = env("DATABASE_URL") }` line while `prisma.config.ts` already defines the datasource. Prisma v7 rejects `url` in `schema.prisma` when using the new config approach.

4. No database provided locally
   - There was no `DATABASE_URL` set in the backend `.env` and no local DB configured. Prisma client initialization fails without a proper datasource adapter or connection string.

## Temporary fixes and edits made

To make incremental progress and allow development iteration without a live database, I applied the following changes:

- Removed `url = env("DATABASE_URL")` from `backend/prisma/schema.prisma` so `npx prisma generate` could succeed using `prisma.config.ts` (Prisma v7 pattern).
  - File edited: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- Installed missing packages: `uuid` and `@prisma/client`, and dev types `@types/uuid`.
- Ran `npx prisma generate` successfully, which generated the client in `node_modules/@prisma/client`.
- Replaced imports/use of the `Role` enum from `@prisma/client` with string literals in server code where enums were compared or assigned. Files edited:
  - [backend/src/routes/auth.ts](backend/src/routes/auth.ts)
  - [backend/src/routes/mlm.ts](backend/src/routes/mlm.ts)
- Implemented a safe, lightweight Prisma stub in `backend/src/utils/prisma.ts` to avoid constructing a `PrismaClient` during local dev when no valid DB/adapter is available. This stub implements the minimal methods used by the app and returns empty/default values so the server can run without a DB.
  - File edited: [backend/src/utils/prisma.ts](backend/src/utils/prisma.ts)

Note: The Prisma stub is a temporary developer convenience only. It is not suitable for production or for testing real DB interactions.

## Current status (what works vs what doesn't)

- Frontend (web): Fully running in development mode. Access the app at:
  - Local: http://localhost:3000
  - Network: (shown in your terminal) e.g., http://10.228.94.252:3000
- Backend (API): Not fully operational for real data. The server repeatedly crashed initially due to TypeScript / Prisma initialization errors. After edits, there are still TypeScript checks and runtime behaviors that need fixing for a real DB.
  - The server will not reliably perform database operations until a real `PrismaClient` is used and a `DATABASE_URL` (or adapter options) is provided.

## Recommended next steps to fully enable backend

1. Choose a database for local development
   - Option A: Use SQLite (easiest for local dev). Example `prisma.config.ts`/`.env` setup:
     - Install `sqlite` driver and update `prisma.config.ts` to use an adapter for SQLite or set `DATABASE_URL="file:./dev.db"` depending on Prisma v7 guidance.
   - Option B: Use PostgreSQL locally (Docker or local install). Set `DATABASE_URL=postgresql://user:pass@localhost:5432/dbname`.

2. Restore a proper `PrismaClient` initialization
   - Replace the stub in `backend/src/utils/prisma.ts` with a real client constructed per Prisma v7 docs. Example pattern (pseudo):

```ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ /* options / adapter per Prisma v7 docs */ });
export default prisma;
```

Follow Prisma v7 docs: https://pris.ly/d/prisma7-client-config

3. Re-introduce type-safe enum usage (if desired)
   - After generating the Prisma client with your chosen DB, the generated types (including enums) will be available. Update files to import enum types only if they are exported by the generated client in your setup. Otherwise use string literals or declare a local TypeScript enum type.

4. Add a `dev` script to `backend/package.json` for easier startup:

```json
"scripts": {
  "dev": "nodemon --watch src --exec \"ts-node src/index.ts\""
}
```

5. Environment variables
   - Create `backend/.env` with at least:
     - `DATABASE_URL=...`
     - `JWT_SECRET=your_jwt_secret`
   - Restart `npx prisma generate` if you change datasource config.

6. Run migrations / seed DB (optional)
   - If you want real data, create migrations and apply them to your DB. Use `npx prisma migrate` commands consistent with Prisma v7.

7. Remove temporary stubs
   - After the real `PrismaClient` is working, remove the temporary stub in `backend/src/utils/prisma.ts` and restore a real client.

## How to run the project locally (concise commands)

Frontend (Next.js dev):

```bash
cd web
npm install
npm run dev
# then open http://localhost:3000
```

Backend (recommended steps, assuming PostgreSQL and real Prisma client):

```bash
cd backend
npm install
# set DATABASE_URL in .env
npx prisma generate
# optionally run migrations
# start dev server
npm run dev
# or: npx nodemon --watch src --exec "ts-node src/index.ts"
```

If you prefer a lightweight local DB (SQLite) to avoid installing Postgres, I can prepare the `prisma.config.ts` and `.env` changes and run migrations for you.

## Security and environment notes

- Do not commit `.env` with secrets. Keep `JWT_SECRET`, `DATABASE_URL`, and any API keys out of version control.
- The temporary Prisma stub bypasses DB auth and should only be used for UI or flow testing, not for production or security-sensitive testing.

## Suggested improvements and TODOs

- Add `dev` and `start` scripts to `backend/package.json`.
- Add a `.env.example` file listing required environment variables and example values.
- Add a basic integration test that starts the server and hits `/health` to assert the API is reachable.
- Optionally, containerize backend and database with Docker Compose for reproducible local development.

## Final notes

If you'd like, I can proceed with any of the following (pick one):
- Wire a SQLite local DB and restore a real `PrismaClient`, run migrations, and start the backend so the API is fully functional locally.
- Revert the temporary stub and create a reproducible Docker Compose setup (Postgres + backend + Prisma) to run the full stack.
- Prepare a `README.md` with step-by-step setup instructions tailored to your preferred local DB option.

---

Report generated by the development assistant on 2026-05-20.
