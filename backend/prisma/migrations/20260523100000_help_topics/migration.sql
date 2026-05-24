CREATE TYPE "HelpTopicRole" AS ENUM ('ALL', 'ADMIN', 'MANAGER', 'BETA_MANAGER', 'LEVEL_1', 'LEVEL_2', 'CUSTOMER');

CREATE TYPE "HelpTopicCategory" AS ENUM ('MY_WORK', 'PRODUCTS', 'NETWORK', 'PAYMENTS', 'EARNINGS', 'ADMIN', 'SUPPORT', 'FAQ');

CREATE TABLE "HelpTopic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "role" "HelpTopicRole" NOT NULL DEFAULT 'ALL',
    "category" "HelpTopicCategory" NOT NULL DEFAULT 'FAQ',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "relatedRoute" TEXT,
    "videoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpTopic_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HelpTopic_role_idx" ON "HelpTopic"("role");
CREATE INDEX "HelpTopic_category_idx" ON "HelpTopic"("category");
CREATE INDEX "HelpTopic_isActive_idx" ON "HelpTopic"("isActive");
CREATE INDEX "HelpTopic_sortOrder_idx" ON "HelpTopic"("sortOrder");

ALTER TABLE "HelpTopic" ADD CONSTRAINT "HelpTopic_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HelpTopic" ADD CONSTRAINT "HelpTopic_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
