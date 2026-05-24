DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApplicationStatus') THEN
    CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MemberApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "requestedRole" "Role" NOT NULL,
    "sponsorPhone" TEXT,
    "aadhaarNumber" TEXT,
    "panNumber" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "approvedById" TEXT,
    "approvedUserId" TEXT,
    "passwordIssued" BOOLEAN NOT NULL DEFAULT false,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MemberApplication_phone_idx" ON "MemberApplication"("phone");
CREATE INDEX IF NOT EXISTS "MemberApplication_status_idx" ON "MemberApplication"("status");
CREATE INDEX IF NOT EXISTS "MemberApplication_requestedRole_idx" ON "MemberApplication"("requestedRole");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MemberApplication_approvedById_fkey'
  ) THEN
    ALTER TABLE "MemberApplication"
      ADD CONSTRAINT "MemberApplication_approvedById_fkey"
      FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MemberApplication_approvedUserId_fkey'
  ) THEN
    ALTER TABLE "MemberApplication"
      ADD CONSTRAINT "MemberApplication_approvedUserId_fkey"
      FOREIGN KEY ("approvedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
