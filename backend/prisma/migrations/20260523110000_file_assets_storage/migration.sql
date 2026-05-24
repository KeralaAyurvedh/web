CREATE TYPE "FileAssetCategory" AS ENUM ('PRODUCT_IMAGE', 'AADHAAR_IMAGE', 'PAN_IMAGE', 'PAYMENT_PROOF', 'OTHER');

CREATE TYPE "FileAssetStorageProvider" AS ENUM ('LOCAL', 'S3');

CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "category" "FileAssetCategory" NOT NULL,
    "storageProvider" "FileAssetStorageProvider" NOT NULL,
    "bucket" TEXT,
    "key" TEXT NOT NULL,
    "publicUrl" TEXT,
    "uploadedById" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FileAsset_category_idx" ON "FileAsset"("category");
CREATE INDEX "FileAsset_storageProvider_idx" ON "FileAsset"("storageProvider");
CREATE INDEX "FileAsset_uploadedById_idx" ON "FileAsset"("uploadedById");
CREATE INDEX "FileAsset_relatedEntityType_relatedEntityId_idx" ON "FileAsset"("relatedEntityType", "relatedEntityId");
CREATE INDEX "FileAsset_isPrivate_idx" ON "FileAsset"("isPrivate");

ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
