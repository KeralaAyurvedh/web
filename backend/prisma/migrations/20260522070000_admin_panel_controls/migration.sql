DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductAvailability') THEN
    CREATE TYPE "ProductAvailability" AS ENUM ('AVAILABLE', 'OUT_OF_STOCK', 'COMING_SOON');
  END IF;
END $$;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "availability" "ProductAvailability" NOT NULL DEFAULT 'AVAILABLE';
