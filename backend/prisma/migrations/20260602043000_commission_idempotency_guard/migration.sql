-- Prevent duplicate commission ledger entries for the same receiver/source/order/matrix/type.
-- COALESCE is used because PostgreSQL unique indexes treat NULL values as distinct.
CREATE UNIQUE INDEX IF NOT EXISTS "CommissionLedger_idempotency_key"
ON "CommissionLedger" (
  "receiverId",
  COALESCE("sourceUserId", ''),
  COALESCE("orderId", ''),
  COALESCE("betaMatrixId", ''),
  "type"
);
