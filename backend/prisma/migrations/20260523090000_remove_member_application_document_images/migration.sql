DO $$
BEGIN
  IF to_regclass('"MemberApplication"') IS NOT NULL THEN
    ALTER TABLE "MemberApplication" DROP COLUMN IF EXISTS "aadhaarImageUrl";
    ALTER TABLE "MemberApplication" DROP COLUMN IF EXISTS "panImageUrl";
  END IF;
END $$;
