DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockAdjustmentType') THEN
    CREATE TYPE "StockAdjustmentType" AS ENUM ('ADD', 'REMOVE', 'CORRECTION');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ProductStockAdjustment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "StockAdjustmentType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "beforeStock" INTEGER NOT NULL,
    "afterStock" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductStockAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductStockAdjustment_productId_idx" ON "ProductStockAdjustment"("productId");
CREATE INDEX IF NOT EXISTS "ProductStockAdjustment_actorId_idx" ON "ProductStockAdjustment"("actorId");
CREATE INDEX IF NOT EXISTS "ProductStockAdjustment_type_idx" ON "ProductStockAdjustment"("type");
CREATE INDEX IF NOT EXISTS "ProductStockAdjustment_createdAt_idx" ON "ProductStockAdjustment"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductStockAdjustment_productId_fkey'
  ) THEN
    ALTER TABLE "ProductStockAdjustment"
      ADD CONSTRAINT "ProductStockAdjustment_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductStockAdjustment_actorId_fkey'
  ) THEN
    ALTER TABLE "ProductStockAdjustment"
      ADD CONSTRAINT "ProductStockAdjustment_actorId_fkey"
      FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
