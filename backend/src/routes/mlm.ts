import { Router, Request, Response } from 'express';
import { verifyToken } from '../middlewares/auth';
import prisma from '../utils/prisma';

const router = Router();

// Get Dashboard Data based on role
router.get('/dashboard', verifyToken, async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    if (user.role === 'SUPER_ADMIN') {
      // Super Admin sees everything
      const totalUsers = await prisma.user.count();
      const totalSales = await prisma.order.aggregate({ _sum: { totalAmount: true } });
      const totalCommissions = await prisma.commission.aggregate({ _sum: { amount: true } });

      return res.json({
        totalUsers,
        totalSales: totalSales._sum.totalAmount || 0,
        totalCommissionsPayout: totalCommissions._sum.amount || 0,
      });
    } else {
      // Agent / Manager sees their own tree & commissions
      const directRecruits = await prisma.user.findMany({
        where: { referredById: user.id },
        select: { id: true, name: true, email: true, referralCode: true, createdAt: true },
      });

      const totalEarnings = await prisma.commission.aggregate({
        where: { recipientId: user.id },
        _sum: { amount: true },
      });

      const recentCommissions = await prisma.commission.findMany({
        where: { recipientId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { sourceUser: { select: { name: true } } }
      });

      return res.json({
        directRecruits,
        totalEarnings: totalEarnings._sum.amount || 0,
        recentCommissions
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper for Recursive CTE to fetch entire downline for Managers/Admins
router.get('/tree', verifyToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  try {
    // Note: Recursive CTE in raw SQL for deep tree. 
    // Prisma doesn't natively do recursive includes for arbitrary depth.
    const downline = await prisma.$queryRaw`
      WITH RECURSIVE downline_tree AS (
        SELECT id, name, "referredById", 1 as level
        FROM "User"
        WHERE "referredById" = ${user.id}
        
        UNION ALL
        
        SELECT u.id, u.name, u."referredById", dt.level + 1
        FROM "User" u
        INNER JOIN downline_tree dt ON u."referredById" = dt.id
      )
      SELECT * FROM downline_tree;
    `;
    
    res.json({ tree: downline });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
