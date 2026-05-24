# Kerala Ayurvedh Backend

Backend API for the Kerala Ayurvedh Android app and admin operations.

## Local Setup

1. Copy environment file:

```bash
copy .env.example .env
```

2. Start PostgreSQL.

Using Docker, if Docker is installed:

```bash
docker compose up -d
```

Without Docker, install PostgreSQL locally and create a database named:

```text
kerala_ayurvedh
```

Then update `DATABASE_URL` inside `.env` with your local PostgreSQL username, password, host, port, and database name.

3. Run migrations:

```bash
npm run prisma:migrate
```

4. Seed admin:

```bash
npm run seed
```

5. Start API:

```bash
npm run dev
```

Default API:

```text
http://localhost:4000
```

Default seeded admin:

```text
phone: 9999999999
password: Admin@12345
```

Change this password before production.

## Important Rules

- No hard deletes after business activity starts.
- Company/Admin confirms payment before commission is generated.
- Commission generation is idempotent.
- Company can have unlimited Managers.
- Each Manager can have max 6 Level 1 Agents.
- Each Level 1 Agent can have max 6 Level 2 Agents.
- Each Manager can have only one Beta Manager.
- Beta Matrix has 216 confirmed customers.
- Beta Matrix completion releases 108000 to the root Manager once.
