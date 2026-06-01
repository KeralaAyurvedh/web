import dotenv from "dotenv";

dotenv.config();

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DIRECT_URL = testDatabaseUrl;
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL or TEST_DATABASE_URL is required for integration tests");
}

const parsed = new URL(databaseUrl);
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

if (!localHosts.has(parsed.hostname)) {
  throw new Error(
    "Refusing to run integration tests against a non-local database. Set TEST_DATABASE_URL to a local disposable PostgreSQL database."
  );
}
