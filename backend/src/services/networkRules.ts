import { PlacementType, Role, UserStatus } from "@prisma/client";
import { prisma } from "../utils/prisma";

const MAX_LEVEL_1_PER_MANAGER = 6;
const MAX_LEVEL_2_PER_LEVEL_1 = 6;
const MAX_CUSTOMERS_PER_BETA_LEVEL_2 = 6;
export const REQUIRED_CONFIRMED_CUSTOMERS_FOR_BETA_MANAGER = 216;

export async function assertCanAddDownline(params: {
  sponsorId: string;
  newRole: Role;
  placementType: PlacementType;
}) {
  const sponsor = await prisma.user.findUnique({
    where: { id: params.sponsorId },
    select: {
      id: true,
      role: true,
      status: true,
      placementType: true
    }
  });

  if (!sponsor) {
    throw new Error("Sponsor not found");
  }

  if (sponsor.status !== UserStatus.ACTIVE) {
    throw new Error("Inactive sponsors cannot add downline users");
  }

  if (params.newRole === Role.LEVEL_1) {
    if (sponsor.role !== Role.MANAGER && sponsor.role !== Role.BETA_MANAGER) {
      throw new Error("Only Manager or Beta Manager can add Level 1 Agents");
    }

    const count = await prisma.user.count({
      where: {
        sponsorId: sponsor.id,
        role: Role.LEVEL_1,
        status: { not: UserStatus.TERMINATED }
      }
    });

    if (count >= MAX_LEVEL_1_PER_MANAGER) {
      throw new Error("This Manager already has the maximum 6 Level 1 Agents");
    }
  }

  if (params.newRole === Role.LEVEL_2) {
    if (sponsor.role !== Role.LEVEL_1) {
      throw new Error("Only Level 1 Agents can add Level 2 Agents");
    }

    const count = await prisma.user.count({
      where: {
        sponsorId: sponsor.id,
        role: Role.LEVEL_2,
        status: { not: UserStatus.TERMINATED }
      }
    });

    if (count >= MAX_LEVEL_2_PER_LEVEL_1) {
      throw new Error("This Level 1 Agent already has the maximum 6 Level 2 Agents");
    }
  }

  if (params.newRole === Role.CUSTOMER) {
    if (
      sponsor.role !== Role.LEVEL_2 &&
      sponsor.role !== Role.LEVEL_1 &&
      sponsor.role !== Role.MANAGER &&
      sponsor.role !== Role.BETA_MANAGER
    ) {
      throw new Error("Only Manager, Main Pillar, or Downline Agents can add Customers");
    }

    if (params.placementType === PlacementType.BETA_MATRIX) {
      const count = await prisma.user.count({
        where: {
          sponsorId: sponsor.id,
          role: Role.CUSTOMER,
          placementType: PlacementType.BETA_MATRIX,
          status: { not: UserStatus.TERMINATED }
        }
      });

      if (count >= MAX_CUSTOMERS_PER_BETA_LEVEL_2) {
        throw new Error("This Beta Matrix Level 2 Agent already has the maximum 6 Customers");
      }
    }
  }
}

export async function assertCanCreateBetaManager(rootManagerId: string) {
  const rootManager = await prisma.user.findUnique({
    where: { id: rootManagerId },
    select: { id: true, role: true, status: true }
  });

  if (!rootManager || rootManager.role !== Role.MANAGER) {
    throw new Error("Beta Manager must be created under a Manager");
  }

  if (rootManager.status !== UserStatus.ACTIVE) {
    throw new Error("Inactive Manager cannot create a Beta Manager");
  }

  const existing = await prisma.betaMatrix.findUnique({
    where: { rootManagerId }
  });

  if (existing) {
    throw new Error("This Manager already has a Beta Manager or completed matrix");
  }

  const confirmedCustomers = await countConfirmedNormalCustomersForManager(rootManagerId);

  if (confirmedCustomers < REQUIRED_CONFIRMED_CUSTOMERS_FOR_BETA_MANAGER) {
    throw new Error(
      `Manager must complete ${REQUIRED_CONFIRMED_CUSTOMERS_FOR_BETA_MANAGER} confirmed customers before adding a Beta Manager. Current progress: ${confirmedCustomers}/${REQUIRED_CONFIRMED_CUSTOMERS_FOR_BETA_MANAGER}`
    );
  }
}

export async function countConfirmedNormalCustomersForManager(rootManagerId: string) {
  return prisma.user.count({
    where: {
      role: Role.CUSTOMER,
      normalManagerId: rootManagerId,
      placementType: PlacementType.NORMAL,
      status: { not: UserStatus.TERMINATED },
      companyPaymentConfirmedAt: { not: null }
    }
  });
}

export async function getBetaManagerEligibility(rootManagerId: string) {
  const [confirmedCustomers, existingMatrix] = await Promise.all([
    countConfirmedNormalCustomersForManager(rootManagerId),
    prisma.betaMatrix.findUnique({ where: { rootManagerId } })
  ]);

  return {
    confirmedCustomers,
    requiredCustomers: REQUIRED_CONFIRMED_CUSTOMERS_FOR_BETA_MANAGER,
    canCreateBetaManager:
      confirmedCustomers >= REQUIRED_CONFIRMED_CUSTOMERS_FOR_BETA_MANAGER && !existingMatrix,
    hasBetaManager: Boolean(existingMatrix)
  };
}
