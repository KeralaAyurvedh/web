import prisma from './prisma';

/**
 * Distributes recruitment commissions up the tree.
 * Level 1: ₹1000
 * Level 2: ₹500
 * Level 3: ₹250
 * Level 4: ₹125 (extending logic to 5 levels as common, or just 3 as per req)
 * Let's stick to the prompt: direct recruiter ₹1000, their upline ₹500, next upline ₹250.
 * Wait, prompt: "₹1,000 recruitment bonus to direct recruiter, ₹500 to their upline, ₹250 to next upline (max 5 levels)."
 * If it's max 5 levels, we can assume level 4 and 5 are 0 or maybe halving. I will assume level 4 is 125, level 5 is 62.5, or just stop at 3 if those are the only numbers provided.
 * Actually, I will distribute 1000, 500, 250, 125, 62.5 up to 5 levels.
 */
const RECRUITMENT_BONUS_LEVELS = [1000, 500, 250, 125, 62.5];

export const distributeRecruitmentBonus = async (newUserId: string, referrerId: string | null) => {
  if (!referrerId) return; // No referrer, no commission

  let currentUplineId: string | null = referrerId;
  let level = 1;

  while (currentUplineId && level <= 5) {
    const bonusAmount = RECRUITMENT_BONUS_LEVELS[level - 1];

    if (bonusAmount > 0) {
      await prisma.commission.create({
        data: {
          recipientId: currentUplineId,
          sourceUserId: newUserId,
          amount: bonusAmount,
          type: 'RECRUITMENT',
          level: level,
        },
      });
    }

    // Find next upline
    const currentUpline = await prisma.user.findUnique({
      where: { id: currentUplineId },
      select: { referredById: true },
    });

    if (currentUpline) {
      currentUplineId = currentUpline.referredById;
      level++;
    } else {
      break;
    }
  }
};

/**
 * Distributes sales commissions up the chain.
 * Sales commission: 10%, 5%, 2.5% up the chain (3 levels).
 */
const SALES_COMMISSION_PERCENTAGES = [0.10, 0.05, 0.025];

export const distributeSalesCommission = async (buyerId: string, orderAmount: number) => {
  const buyer = await prisma.user.findUnique({
    where: { id: buyerId },
    select: { referredById: true },
  });

  if (!buyer || !buyer.referredById) return;

  let currentUplineId: string | null = buyer.referredById;
  let level = 1;

  while (currentUplineId && level <= 3) {
    const percentage = SALES_COMMISSION_PERCENTAGES[level - 1];
    const commissionAmount = orderAmount * percentage;

    if (commissionAmount > 0) {
      await prisma.commission.create({
        data: {
          recipientId: currentUplineId,
          sourceUserId: buyerId,
          amount: commissionAmount,
          type: 'SALES',
          level: level,
        },
      });
    }

    const currentUpline = await prisma.user.findUnique({
      where: { id: currentUplineId },
      select: { referredById: true },
    });

    if (currentUpline) {
      currentUplineId = currentUpline.referredById;
      level++;
    } else {
      break;
    }
  }
};
