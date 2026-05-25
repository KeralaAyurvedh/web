import bcrypt from "bcryptjs";
import { Role, HelpTopicRole, HelpTopicCategory, type Prisma } from "@prisma/client";
import { prisma } from "./utils/prisma";

async function main() {
  const phone = process.env.SEED_ADMIN_PHONE ?? "9999999999";
  const adminReferralCode = process.env.SEED_ADMIN_REFERRAL_CODE ?? "ADMIN000001";
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
  const existingAdminByPhone = await prisma.user.findUnique({ where: { phone } });
  const existingAdminByReferralCode = await prisma.user.findUnique({ where: { referralCode: adminReferralCode } });
  const existingAdmin = existingAdminByPhone ?? existingAdminByReferralCode;

  if (process.env.NODE_ENV === "production" && !existingAdmin && !seedAdminPassword) {
    throw new Error("SEED_ADMIN_PASSWORD is required for first production seed");
  }

  const password = seedAdminPassword ?? "Admin@12345";
  const passwordHash = seedAdminPassword || !existingAdmin ? await bcrypt.hash(password, 12) : undefined;

  let admin;
  if (existingAdmin) {
    const adminUpdate: Prisma.UserUpdateInput = {
      name: existingAdmin.name || "Company Admin",
      ...(passwordHash ? { passwordHash } : {}),
      status: "ACTIVE",
      role: Role.ADMIN
    };

    if (!existingAdminByPhone || existingAdminByPhone.id === existingAdmin.id) {
      adminUpdate.phone = phone;
    }

    if (!existingAdminByReferralCode || existingAdminByReferralCode.id === existingAdmin.id) {
      adminUpdate.referralCode = adminReferralCode;
    }

    admin = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: adminUpdate
    });
  } else {
    admin = await prisma.user.create({
      data: {
        name: "Company Admin",
        phone,
        passwordHash: passwordHash ?? await bcrypt.hash(password, 12),
        role: Role.ADMIN,
        referralCode: adminReferralCode
      }
    });
  }

  if (existingAdminByPhone && existingAdminByReferralCode && existingAdminByPhone.id !== existingAdminByReferralCode.id) {
    console.warn(
      `Seed admin phone ${phone} and referral code ${adminReferralCode} belong to different users. ` +
      `Updated phone owner ${existingAdminByPhone.id} and left referral code owner unchanged.`
    );
  }

  console.log("Seed admin ready:");
  console.log({
    id: admin.id,
    phone: admin.phone,
    role: admin.role
  });

  const products = [
    {
      name: "Kerala Weight Loss Powder",
      category: "Weight Management",
      description: "Ayurvedic wellness powder for weight management support.",
      shortDescription: "Daily Ayurvedic support for weight management.",
      fullDescription: "Kerala Weight Loss Powder is positioned as a wellness product for customers looking for natural support in their daily weight management routine.",
      usageInstructions: "Use as directed by the company or product label.",
      benefits: "Supports weight management routine, daily wellness and digestion-focused lifestyle habits.",
      size: "Ask company",
      price: 0,
      stock: 0
    },
    {
      name: "Gastric Powder",
      category: "Digestive Care",
      description: "Ayurvedic digestive wellness powder.",
      shortDescription: "Digestive care powder for daily wellness.",
      fullDescription: "Gastric Powder is positioned for digestive wellness support and customer routines related to gastric comfort.",
      usageInstructions: "Use as directed by the company or product label.",
      benefits: "Supports digestive wellness and gastric comfort routines.",
      size: "Ask company",
      price: 0,
      stock: 0
    },
    {
      name: "Skin Allergy Cream",
      category: "Skin Care",
      description: "Ayurvedic skin care cream for allergy-focused care routines.",
      shortDescription: "Skin care cream for allergy-focused routines.",
      fullDescription: "Skin Allergy Cream is positioned for customers looking for Ayurvedic skin care support.",
      usageInstructions: "Apply as directed by the company or product label.",
      benefits: "Supports skin care routines and comfort-focused use.",
      size: "Ask company",
      price: 0,
      stock: 0
    }
  ];

  for (const product of products) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: product
      });
    } else {
      await prisma.product.create({
        data: {
          ...product,
          createdById: admin.id
        }
      });
    }
  }

  console.log(`Seed products ready: ${products.length}`);

  const helpTopics = [
    {
      title: "Customer Ordering Guide",
      shortDescription: "How to purchase weight loss powders and wellness products.",
      content: "Customers can order weight loss powders and Ayurvedic formulations directly inside the app. Simply open the Products tab, select your items, enter the quantities, review the pricing details, and tap 'Place Order' to submit your request. Payment is collected manually via cash or UPI by your direct Downline representative sponsor. Once they receive and record the payment handover, the order proceeds through processing and verification stages.",
      role: HelpTopicRole.CUSTOMER,
      category: HelpTopicCategory.PRODUCTS,
      steps: ["Open the Products tab to view the Ayurvedic catalog", "Select the desired Ayurvedic powder or cream", "Verify price and select quantity", "Tap 'Place Order' and note the Order ID", "Coordinate manual cash/UPI payment with your Downline representative sponsor"],
      sortOrder: 1
    },
    {
      title: "Manual Payment Handover Guide",
      shortDescription: "Instructions for cash and UPI handovers with sponsors.",
      content: "All payments are processed manually through a secure multi-tier handover sequence: (1) Customers pay their Downline representative. (2) Downline representatives hand over collected cash or transfer UPI to their Main Pillar advisor. (3) Main Pillar advisors consolidate and transfer the funds to their team Manager. (4) The Manager transfers the consolidated funds directly to the Company. For every handover, you MUST log the transaction under the Payments tab, enter the amount, select the corresponding Order ID, and upload a valid receipt/proof of payment. The handover will remain PENDING until the recipient verifies the funds and marks it as RECEIVED. Only received payments will trigger order processing and commission releases.",
      role: HelpTopicRole.ALL,
      category: HelpTopicCategory.PAYMENTS,
      steps: ["Collect payment from customer or downline", "Go to the Payments tab and tap 'Record Payment Handover'", "Input the exact handover amount and corresponding Order ID", "Upload a PDF or image proof of payment (receipt/screenshot)", "Wait for the receiver to verify the funds and mark it as RECEIVED"],
      sortOrder: 2
    },
    {
      title: "Downline Representative Management",
      shortDescription: "Guide for Downline representatives on onboarding Customers.",
      content: "As a Downline representative, you sell products directly to Customers, collect cash/UPI payments from them, and record order handovers. You earn a direct referral commission of Rs 1,000 for each new Customer you onboard once the Company Admin confirms payment. You must ensure all customer information (Name, Phone, Email, Aadhaar, PAN) is complete and mandatory when submitting applications, and always transfer collected payments up to your Main Pillar advisor promptly.",
      role: HelpTopicRole.LEVEL_2,
      category: HelpTopicCategory.MY_WORK,
      steps: ["Go to the Network tab and tap 'Add Customer Application'", "Fill in complete, mandatory Customer details (Aadhaar, PAN, Phone, Email)", "Collect manual cash or UPI payment from the customer", "Navigate to Payments and hand over the funds to your Main Pillar advisor", "Wait for company confirmation and track your pending commission"],
      sortOrder: 3
    },
    {
      title: "Main Pillar Advisor Coordination",
      shortDescription: "Guide for Main Pillar advisors on building their Downline team.",
      content: "As a Main Pillar advisor, your primary responsibility is to build and manage a productive team of Downline representatives. You earn a direct commission of Rs 1,000 for recruiting a Downline representative, and a passive commission of Rs 500 when your Downline representatives successfully onboard new customers or sell products. You also collect manual payment handovers from your Downline team, consolidate them, and transfer them up to your Manager while logging transaction proofs inside the app.",
      role: HelpTopicRole.LEVEL_1,
      category: HelpTopicCategory.MY_WORK,
      steps: ["Onboard Downline representatives using the Network tab", "Collect manual payment handovers from your Downline team", "Consolidate and record payment handovers to your Manager with receipt proofs", "Open your Downline tab to monitor team structure and sales activity"],
      sortOrder: 4
    },
    {
      title: "Manager Duties & Beta Matrix targets",
      shortDescription: "Target requirements to unlock Beta Manager status.",
      content: "Managers coordinate Main Pillar advisors and Downline representatives. You earn Rs 1,000 for each direct Main Pillar member join, and Rs 500 for each Downline representative join. To unlock the high-earning Beta Matrix, you must complete 216 confirmed customers within your normal organization first. You are responsible for supporting your advisors and verifying all payment handovers before passing them to the Company.",
      role: HelpTopicRole.MANAGER,
      category: HelpTopicCategory.MY_WORK,
      steps: ["Support Main Pillar advisors and Downline representatives in their daily sales", "Verify team payment handovers and transfer them directly to the Company", "Track your normal Customer counts on your dashboard summary", "Once 216 confirmed customers are reached, apply for the Beta Manager upgrade"],
      sortOrder: 5
    },
    {
      title: "Beta Matrix Mechanics & Payouts",
      shortDescription: "Understanding the 108,000 completion commission.",
      content: "The Beta Matrix is a specialized downline matrix capped at exactly 216 customers. For each customer added within a Manager's Beta Matrix, the Downline representative gets Rs 1,000 direct commission, and Rs 500 is held as pending for the root Manager. Once the Beta Matrix hits the 216 confirmed customers target, the root Manager receives a major consolidated lump-sum payout of Rs 108,000. Only one active Beta Matrix is allowed per manager.",
      role: HelpTopicRole.BETA_MANAGER,
      category: HelpTopicCategory.EARNINGS,
      steps: ["Recruit active Main Pillar advisors into your Beta Matrix", "Ensure your Downline representatives are actively onboarding customers", "Track confirmed Beta Matrix customer counts on your home dashboard", "Receive the lump-sum Rs 108,000 payout once all 216 customers are completed and confirmed"],
      sortOrder: 6
    },
    {
      title: "Ayurvedic Products Catalog",
      shortDescription: "Information on our current product range.",
      content: "We offer three primary Ayurvedic health formulations: (1) Kerala Weight Loss Powder for natural weight management support, (2) Gastric Powder for digestive comfort, (3) Skin Allergy Cream for topical allergy comfort.",
      role: HelpTopicRole.ALL,
      category: HelpTopicCategory.PRODUCTS,
      steps: ["Kerala Weight Loss Powder - daily wellness support", "Gastric Powder - digestive care routine", "Skin Allergy Cream - topical skin comfort"],
      sortOrder: 7
    },
    {
      title: "Customer Support & Contact Info",
      shortDescription: "How to get help from Kerala Ayurvedh support team.",
      content: "If you have disputes, delivery issues, or need help with manual payments, contact Kerala Ayurvedh support by email only. Support hours are Monday to Saturday, 9:00 AM to 6:00 PM. Send your User ID, Order ID if applicable, and screenshots or receipt proof to support@keralaayurvedh.com.",
      role: HelpTopicRole.ALL,
      category: HelpTopicCategory.SUPPORT,
      steps: ["Email support@keralaayurvedh.com", "Include your User ID", "Include the Order ID for order or payment questions", "Attach screenshots or receipt proof when useful"],
      sortOrder: 8
    },
    {
      title: "Privacy and Aadhaar/PAN Consent",
      shortDescription: "How identity numbers and private files are handled.",
      content: "Kerala Ayurvedh collects Aadhaar and PAN numbers only for identity verification, application review, fraud prevention, business compliance, and legal recordkeeping. Aadhaar/PAN images are not collected. Payment proof files are private and visible only through authorized secure links. Applications and upgrade requests require explicit consent before Aadhaar/PAN details are submitted.",
      role: HelpTopicRole.ALL,
      category: HelpTopicCategory.FAQ,
      steps: ["Read the consent text before submitting applications or upgrade requests", "Submit Aadhaar/PAN numbers only when the applicant has consented", "Do not upload Aadhaar or PAN images", "Email support@keralaayurvedh.com for privacy questions or correction requests"],
      sortOrder: 9
    }
  ];


  for (const topic of helpTopics) {
    const existing = await prisma.helpTopic.findFirst({ where: { title: topic.title } });
    if (existing) {
      await prisma.helpTopic.update({
        where: { id: existing.id },
        data: {
          ...topic,
          steps: topic.steps,
          updatedById: admin.id
        }
      });
    } else {
      await prisma.helpTopic.create({
        data: {
          ...topic,
          steps: topic.steps,
          createdById: admin.id,
          updatedById: admin.id
        }
      });
    }
  }

  console.log(`Seed help topics ready: ${helpTopics.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
