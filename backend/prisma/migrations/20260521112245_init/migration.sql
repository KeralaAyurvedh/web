-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'BETA_MANAGER', 'LEVEL_1', 'LEVEL_2', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "PlacementType" AS ENUM ('NORMAL', 'BETA_MATRIX');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'MONEY_COLLECTED_BY_LEVEL_2', 'MONEY_TRANSFERRED_TO_LEVEL_1', 'MONEY_TRANSFERRED_TO_MANAGER', 'MONEY_RECEIVED_BY_COMPANY', 'PRODUCT_RELEASED_BY_COMPANY', 'PRODUCT_RECEIVED_BY_MANAGER', 'PRODUCT_RECEIVED_BY_LEVEL_1', 'PRODUCT_RECEIVED_BY_LEVEL_2', 'DELIVERED_TO_CUSTOMER', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIALLY_RECEIVED', 'RECEIVED_BY_COMPANY', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentHandoverStatus" AS ENUM ('PENDING', 'HANDED_OVER', 'RECEIVED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('DIRECT_LEVEL_1_JOIN', 'DIRECT_LEVEL_2_JOIN', 'UPLINE_LEVEL_2_JOIN', 'CUSTOMER_JOIN', 'BETA_MATRIX_PENDING', 'BETA_MATRIX_COMPLETION', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "UpgradeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReassignmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BetaMatrixStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FROZEN', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "referralCode" TEXT NOT NULL,
    "placementType" "PlacementType" NOT NULL DEFAULT 'NORMAL',
    "companyPaymentConfirmedAt" TIMESTAMP(3),
    "commissionProcessedAt" TIMESTAMP(3),
    "sponsorId" TEXT,
    "normalManagerId" TEXT,
    "betaRootManagerId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "imageUrl" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "collectedById" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentHandover" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "fromUserId" TEXT,
    "toUserId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentHandoverStatus" NOT NULL DEFAULT 'PENDING',
    "proofUrl" TEXT,
    "notes" TEXT,
    "handedOverAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentHandover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionLedger" (
    "id" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "sourceUserId" TEXT,
    "orderId" TEXT,
    "betaMatrixId" TEXT,
    "type" "CommissionType" NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "holdUntilMatrixComplete" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetaMatrix" (
    "id" TEXT NOT NULL,
    "rootManagerId" TEXT NOT NULL,
    "betaManagerId" TEXT NOT NULL,
    "status" "BetaMatrixStatus" NOT NULL DEFAULT 'ACTIVE',
    "confirmedCustomers" INTEGER NOT NULL DEFAULT 0,
    "requiredCustomers" INTEGER NOT NULL DEFAULT 216,
    "pendingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "completionAmount" DECIMAL(12,2) NOT NULL DEFAULT 108000,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetaMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleUpgradeRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "fromRole" "Role" NOT NULL,
    "toRole" "Role" NOT NULL,
    "targetSponsorId" TEXT,
    "status" "UpgradeStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "approvedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleUpgradeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReassignmentRequest" (
    "id" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "fromSponsorId" TEXT,
    "toSponsorId" TEXT NOT NULL,
    "status" "ReassignmentStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "approvedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReassignmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_sponsorId_idx" ON "User"("sponsorId");

-- CreateIndex
CREATE INDEX "User_normalManagerId_idx" ON "User"("normalManagerId");

-- CreateIndex
CREATE INDEX "User_betaRootManagerId_idx" ON "User"("betaRootManagerId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_collectedById_idx" ON "Order"("collectedById");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "PaymentHandover_orderId_idx" ON "PaymentHandover"("orderId");

-- CreateIndex
CREATE INDEX "PaymentHandover_fromUserId_idx" ON "PaymentHandover"("fromUserId");

-- CreateIndex
CREATE INDEX "PaymentHandover_toUserId_idx" ON "PaymentHandover"("toUserId");

-- CreateIndex
CREATE INDEX "PaymentHandover_status_idx" ON "PaymentHandover"("status");

-- CreateIndex
CREATE INDEX "CommissionLedger_receiverId_idx" ON "CommissionLedger"("receiverId");

-- CreateIndex
CREATE INDEX "CommissionLedger_sourceUserId_idx" ON "CommissionLedger"("sourceUserId");

-- CreateIndex
CREATE INDEX "CommissionLedger_orderId_idx" ON "CommissionLedger"("orderId");

-- CreateIndex
CREATE INDEX "CommissionLedger_betaMatrixId_idx" ON "CommissionLedger"("betaMatrixId");

-- CreateIndex
CREATE INDEX "CommissionLedger_status_idx" ON "CommissionLedger"("status");

-- CreateIndex
CREATE INDEX "CommissionLedger_type_idx" ON "CommissionLedger"("type");

-- CreateIndex
CREATE UNIQUE INDEX "BetaMatrix_rootManagerId_key" ON "BetaMatrix"("rootManagerId");

-- CreateIndex
CREATE UNIQUE INDEX "BetaMatrix_betaManagerId_key" ON "BetaMatrix"("betaManagerId");

-- CreateIndex
CREATE INDEX "RoleUpgradeRequest_requesterId_idx" ON "RoleUpgradeRequest"("requesterId");

-- CreateIndex
CREATE INDEX "RoleUpgradeRequest_status_idx" ON "RoleUpgradeRequest"("status");

-- CreateIndex
CREATE INDEX "ReassignmentRequest_subjectUserId_idx" ON "ReassignmentRequest"("subjectUserId");

-- CreateIndex
CREATE INDEX "ReassignmentRequest_status_idx" ON "ReassignmentRequest"("status");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_normalManagerId_fkey" FOREIGN KEY ("normalManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_betaRootManagerId_fkey" FOREIGN KEY ("betaRootManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentHandover" ADD CONSTRAINT "PaymentHandover_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentHandover" ADD CONSTRAINT "PaymentHandover_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentHandover" ADD CONSTRAINT "PaymentHandover_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_betaMatrixId_fkey" FOREIGN KEY ("betaMatrixId") REFERENCES "BetaMatrix"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetaMatrix" ADD CONSTRAINT "BetaMatrix_rootManagerId_fkey" FOREIGN KEY ("rootManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetaMatrix" ADD CONSTRAINT "BetaMatrix_betaManagerId_fkey" FOREIGN KEY ("betaManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleUpgradeRequest" ADD CONSTRAINT "RoleUpgradeRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleUpgradeRequest" ADD CONSTRAINT "RoleUpgradeRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReassignmentRequest" ADD CONSTRAINT "ReassignmentRequest_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReassignmentRequest" ADD CONSTRAINT "ReassignmentRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
