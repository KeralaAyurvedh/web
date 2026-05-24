import { BetaMatrixStatus, CommissionStatus, CommissionType, PlacementType, Role, type PrismaClient } from "@prisma/client";

const DIRECT_JOIN_COMMISSION = 1000;
const UPLINE_LEVEL_2_JOIN_COMMISSION = 500;
const BETA_CUSTOMER_HOLD_AMOUNT = 500;
const BETA_COMPLETION_CUSTOMERS = 216;
const BETA_COMPLETION_AMOUNT = 108000;

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function createCommissionsAfterPaymentConfirmation(tx: Tx, sourceUserId: string) {
  const source = await tx.user.findUnique({
    where: { id: sourceUserId },
    include: {
      sponsor: {
        include: {
          sponsor: true
        }
      },
      betaRootManager: true
    }
  });

  if (!source) {
    throw new Error("Commission source user not found");
  }

  if (source.commissionProcessedAt) {
    return;
  }

  if (source.role === Role.LEVEL_1 && (source.sponsor?.role === Role.MANAGER || source.sponsor?.role === Role.BETA_MANAGER)) {
    await tx.commissionLedger.create({
      data: {
        receiverId: source.sponsor.id,
        sourceUserId: source.id,
        type: CommissionType.DIRECT_LEVEL_1_JOIN,
        status: CommissionStatus.APPROVED,
        amount: DIRECT_JOIN_COMMISSION
      }
    });
  }

  if (source.role === Role.LEVEL_2 && source.sponsor?.role === Role.LEVEL_1) {
    await tx.commissionLedger.create({
      data: {
        receiverId: source.sponsor.id,
        sourceUserId: source.id,
        type: CommissionType.DIRECT_LEVEL_2_JOIN,
        status: CommissionStatus.APPROVED,
        amount: DIRECT_JOIN_COMMISSION
      }
    });

    const manager = source.sponsor.sponsor;
    if (manager && (manager.role === Role.MANAGER || manager.role === Role.BETA_MANAGER)) {
      await tx.commissionLedger.create({
        data: {
          receiverId: manager.id,
          sourceUserId: source.id,
          type: CommissionType.UPLINE_LEVEL_2_JOIN,
          status: CommissionStatus.APPROVED,
          amount: UPLINE_LEVEL_2_JOIN_COMMISSION
        }
      });
    }
  }

  if (source.role === Role.CUSTOMER && source.sponsor?.role === Role.LEVEL_2) {
    await tx.commissionLedger.create({
      data: {
        receiverId: source.sponsor.id,
        sourceUserId: source.id,
        type: CommissionType.CUSTOMER_JOIN,
        status: CommissionStatus.APPROVED,
        amount: DIRECT_JOIN_COMMISSION
      }
    });

    if (source.placementType === PlacementType.BETA_MATRIX && source.betaRootManagerId) {
      const currentMatrix = await tx.betaMatrix.findUnique({
        where: { rootManagerId: source.betaRootManagerId }
      });

      if (!currentMatrix) {
        throw new Error("Beta Matrix not found for customer");
      }

      if (currentMatrix.status !== BetaMatrixStatus.ACTIVE) {
        throw new Error("Beta Matrix is not active");
      }

      await tx.commissionLedger.create({
        data: {
          receiverId: source.betaRootManagerId,
          sourceUserId: source.id,
          betaMatrixId: currentMatrix.id,
          type: CommissionType.BETA_MATRIX_PENDING,
          status: CommissionStatus.PENDING,
          amount: BETA_CUSTOMER_HOLD_AMOUNT,
          holdUntilMatrixComplete: true
        }
      });

      const confirmedCustomers = currentMatrix.confirmedCustomers + 1;
      const matrix = await tx.betaMatrix.update({
        where: { id: currentMatrix.id },
        data: {
          confirmedCustomers,
          pendingAmount: { increment: BETA_CUSTOMER_HOLD_AMOUNT }
        }
      });

      if (confirmedCustomers >= BETA_COMPLETION_CUSTOMERS) {
        const completedMatrix = await tx.betaMatrix.update({
          where: { id: matrix.id },
          data: {
            status: BetaMatrixStatus.COMPLETED,
            completedAt: new Date(),
            completionAmount: BETA_COMPLETION_AMOUNT
          }
        });

        await tx.commissionLedger.create({
          data: {
            receiverId: source.betaRootManagerId,
            betaMatrixId: completedMatrix.id,
            type: CommissionType.BETA_MATRIX_COMPLETION,
            status: CommissionStatus.APPROVED,
            amount: BETA_COMPLETION_AMOUNT,
            notes: "Released after Beta Matrix completed 216 confirmed customers"
          }
        });
      }
    }
  }

  await tx.user.update({
    where: { id: source.id },
    data: {
      companyPaymentConfirmedAt: source.companyPaymentConfirmedAt ?? new Date(),
      commissionProcessedAt: new Date()
    }
  });
}
