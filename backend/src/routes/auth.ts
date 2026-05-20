import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { distributeRecruitmentBonus } from '../utils/mlm';

const router = Router();

// Helper to generate 6-char alphanumeric referral code
const generateReferralCode = () => {
  return uuidv4().substring(0, 6).toUpperCase();
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, referralCode } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    let referredById = null;

    // Handle Referral logic
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode },
        include: { _count: { select: { referrals: true } } },
      });

      if (!referrer) {
        return res.status(400).json({ message: 'Invalid referral code' });
      }

      // Max 6 recruits check
      if (referrer._count.referrals >= 6) {
        return res.status(400).json({ message: 'Referrer has reached the maximum of 6 direct recruits. Spillover is not active.' });
      }

      referredById = referrer.id;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newReferralCode = generateReferralCode();

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        referralCode: newReferralCode,
        referredById,
        // First user can be SUPER_ADMIN manually, otherwise AGENT
        role: 'AGENT',
      },
    });

    // Distribute recruitment bonus (assuming it triggers on free registration for simplicity, 
    // or you could move this to a "activate account" endpoint)
    await distributeRecruitmentBonus(newUser.id, referredById);

    res.status(201).json({ message: 'User registered successfully', user: { id: newUser.id, name: newUser.name, referralCode: newUser.referralCode } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, role: user.role, referralCode: user.referralCode } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
