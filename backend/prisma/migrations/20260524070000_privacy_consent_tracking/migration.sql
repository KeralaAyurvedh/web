ALTER TABLE "RoleUpgradeRequest"
ADD COLUMN IF NOT EXISTS "privacyConsentAcceptedAt" TIMESTAMP(3);

ALTER TABLE "MemberApplication"
ADD COLUMN IF NOT EXISTS "privacyConsentAcceptedAt" TIMESTAMP(3);
