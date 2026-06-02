import { PrismaClient, Role } from "@prisma/client";

// Initialize local Prisma client
const prisma = new PrismaClient();

const isDeepPurge = process.argv.includes("--deep") || process.env.DEEP_PURGE === "true";

async function purgeDatabase() {
  console.log(`⚠️ Starting pure database purge (Mode: ${isDeepPurge ? "DEEP PRODUCTION PURGE" : "STANDARD TEST RESET"})...`);
  
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete all transactional tables in order of dependency
      console.log("- Deleting audit logs...");
      await tx.auditLog.deleteMany();

      console.log("- Deleting stock adjustments...");
      await tx.productStockAdjustment.deleteMany();

      console.log("- Deleting commission ledger...");
      await tx.commissionLedger.deleteMany();

      console.log("- Deleting payment handovers...");
      await tx.paymentHandover.deleteMany();

      console.log("- Deleting order items...");
      await tx.orderItem.deleteMany();

      console.log("- Deleting orders...");
      await tx.order.deleteMany();

      console.log("- Deleting Beta Matrices...");
      await tx.betaMatrix.deleteMany();

      console.log("- Deleting role upgrade requests...");
      await tx.roleUpgradeRequest.deleteMany();

      console.log("- Deleting sponsor/reassignment requests...");
      await tx.reassignmentRequest.deleteMany();

      console.log("- Deleting member applications...");
      await tx.memberApplication.deleteMany();

      console.log("- Deleting uploaded file assets...");
      await tx.fileAsset.deleteMany();

      // 2. Deep Purge additional schemas (Products & Help Topics) if requested
      if (isDeepPurge) {
        console.log("- [DEEP] Deleting all product records...");
        await tx.product.deleteMany();

        console.log("- [DEEP] Deleting all help topics...");
        await tx.helpTopic.deleteMany();
      }

      // 3. Clear downline, sponsor, and manager connections on all users to prevent constraint errors
      console.log("- Disconnecting self-referential relationships on all users...");
      await tx.user.updateMany({
        data: {
          sponsorId: null,
          normalManagerId: null,
          betaRootManagerId: null,
          createdById: null
        }
      });

      // 4. Delete all non-admin users
      console.log("- Deleting all non-ADMIN accounts...");
      const userDelete = await tx.user.deleteMany({
        where: {
          role: { not: Role.ADMIN }
        }
      });

      console.log(`✅ Pure database purge complete. Deleted ${userDelete.count} non-admin user records.`);
      if (isDeepPurge) {
        console.log("✅ Deep purge: All orders, products, help topics, and mock users have been completely cleared.");
      }
    });
  } catch (error) {
    console.error("❌ Database purge failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

purgeDatabase();
