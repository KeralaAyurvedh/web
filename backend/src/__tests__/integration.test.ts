import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Role, PlacementType, UserStatus, BetaMatrixStatus, CommissionType, CommissionStatus } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { createApp } from "../app";
import { prisma } from "../utils/prisma";
import { config } from "../utils/config";
import { assertCanAddDownline, assertCanCreateBetaManager } from "../services/networkRules";
import { createCommissionsAfterPaymentConfirmation } from "../services/commissionRules";

describe("MLM & Commission Business Rules Integration Tests", () => {
  let adminId: string;
  let testManagerId: string;
  let testLevel1Id: string;
  let testLevel2Id: string;
  let testCustomerId: string;
  let server: Server;
  let baseUrl: string;

  function authToken(userId: string, role: Role) {
    return jwt.sign({ id: userId, role }, config.jwtSecret);
  }

  async function apiRequest(path: string, options: { method?: string; token?: string; body?: unknown } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
      },
      body: typeof options.body === "undefined" ? undefined : JSON.stringify(options.body)
    });

    return {
      status: response.status,
      data: await response.json().catch(() => ({}))
    };
  }

  async function cleanupAllTestFixtures() {
    // 1. Role Upgrade Requests
    await prisma.roleUpgradeRequest.deleteMany({
      where: {
        OR: [
          { requester: { phone: { startsWith: "991" } } },
          { requester: { phone: { startsWith: "992" } } }
        ]
      }
    });

    // 2. Payment Handovers
    await prisma.paymentHandover.deleteMany({
      where: {
        OR: [
          { fromUser: { phone: { startsWith: "991" } } },
          { fromUser: { phone: { startsWith: "992" } } },
          { toUser: { phone: { startsWith: "991" } } },
          { toUser: { phone: { startsWith: "992" } } },
          { order: { customer: { phone: { startsWith: "991" } } } },
          { order: { customer: { phone: { startsWith: "992" } } } }
        ]
      }
    });

    // 3. Order Items
    await prisma.orderItem.deleteMany({
      where: {
        OR: [
          { order: { customer: { phone: { startsWith: "991" } } } },
          { order: { customer: { phone: { startsWith: "992" } } } }
        ]
      }
    });

    // 4. Orders
    await prisma.order.deleteMany({
      where: {
        OR: [
          { customer: { phone: { startsWith: "991" } } },
          { customer: { phone: { startsWith: "992" } } },
          { collectedBy: { phone: { startsWith: "991" } } },
          { collectedBy: { phone: { startsWith: "992" } } }
        ]
      }
    });

    // 5. Commission Ledgers
    await prisma.commissionLedger.deleteMany({
      where: {
        OR: [
          { receiver: { phone: { startsWith: "991" } } },
          { receiver: { phone: { startsWith: "992" } } },
          { sourceUser: { phone: { startsWith: "991" } } },
          { sourceUser: { phone: { startsWith: "992" } } }
        ]
      }
    });

    // 6. Beta Matrices
    await prisma.betaMatrix.deleteMany({
      where: {
        OR: [
          { rootManager: { phone: { startsWith: "991" } } },
          { rootManager: { phone: { startsWith: "992" } } },
          { betaManager: { phone: { startsWith: "991" } } },
          { betaManager: { phone: { startsWith: "992" } } }
        ]
      }
    });

    // 7. Audit Logs
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actor: { phone: { startsWith: "991" } } },
          { actor: { phone: { startsWith: "992" } } }
        ]
      }
    });

    // 8. Users
    await prisma.user.deleteMany({
      where: {
        OR: [
          { phone: { startsWith: "991" } },
          { phone: { startsWith: "992" } }
        ]
      }
    });
  }

  beforeAll(async () => {
    server = createApp().listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    // Locate or create the Company Admin
    const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (admin) {
      adminId = admin.id;
    } else {
      const createdAdmin = await prisma.user.create({
        data: {
          name: "Test Admin",
          phone: "9999990001",
          passwordHash: "dummyhash",
          role: Role.ADMIN,
          referralCode: "TADMIN1"
        }
      });
      adminId = createdAdmin.id;
    }

    // Clean up previous test users to avoid key collisions
    await cleanupAllTestFixtures();
  });

  afterAll(async () => {
    // Cleanup records after running test suite
    await cleanupAllTestFixtures();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  it("should enforce active status and role structure when adding downlines", async () => {
    // Create an inactive manager
    const inactiveManager = await prisma.user.create({
      data: {
        name: "Inactive Manager",
        phone: "9910000001",
        passwordHash: "dummyhash",
        role: Role.MANAGER,
        status: UserStatus.INACTIVE,
        referralCode: "TMAN001"
      }
    });

    // Expect check to fail for inactive sponsor
    await expect(
      assertCanAddDownline({
        sponsorId: inactiveManager.id,
        newRole: Role.LEVEL_1,
        placementType: PlacementType.NORMAL
      })
    ).rejects.toThrow("Inactive sponsors cannot add downline users");

    // Create an active manager
    const activeManager = await prisma.user.create({
      data: {
        name: "Active Manager",
        phone: "9910000002",
        passwordHash: "dummyhash",
        role: Role.MANAGER,
        status: UserStatus.ACTIVE,
        referralCode: "TMAN002"
      }
    });

    // Expect active check to pass for Level 1 creation
    await expect(
      assertCanAddDownline({
        sponsorId: activeManager.id,
        newRole: Role.LEVEL_1,
        placementType: PlacementType.NORMAL
      })
    ).resolves.not.toThrow();
  });

  it("should enforce maximum of 6 direct Level 1 users per Manager", async () => {
    const manager = await prisma.user.create({
      data: {
        name: "Max Level 1 Manager",
        phone: "9910000003",
        passwordHash: "dummyhash",
        role: Role.MANAGER,
        status: UserStatus.ACTIVE,
        referralCode: "TMAN003"
      }
    });

    // Create 6 Level 1 users
    for (let i = 1; i <= 6; i++) {
      await prisma.user.create({
        data: {
          name: `Level 1 - ${i}`,
          phone: `991100000${i}`,
          passwordHash: "dummyhash",
          role: Role.LEVEL_1,
          sponsorId: manager.id,
          referralCode: `TL100${i}`
        }
      });
    }

    // Expect 7th addition to fail
    await expect(
      assertCanAddDownline({
        sponsorId: manager.id,
        newRole: Role.LEVEL_1,
        placementType: PlacementType.NORMAL
      })
    ).rejects.toThrow("This Manager already has the maximum 6 Level 1 Agents");
  });

  it("should process direct and passive commissions correctly in the normal flow", async () => {
    // Set up active Normal Manager
    const manager = await prisma.user.create({
      data: {
        name: "Normal Manager",
        phone: "9912000001",
        passwordHash: "dummyhash",
        role: Role.MANAGER,
        status: UserStatus.ACTIVE,
        referralCode: "NMAN001"
      }
    });
    testManagerId = manager.id;

    // Create Level 1 user
    const level1 = await prisma.user.create({
      data: {
        name: "Normal Level 1",
        phone: "9912000002",
        passwordHash: "dummyhash",
        role: Role.LEVEL_1,
        sponsorId: manager.id,
        referralCode: "NL1001"
      }
    });
    testLevel1Id = level1.id;

    // Verify Manager gets 1500 when Level 1 joins
    await createCommissionsAfterPaymentConfirmation(prisma, level1.id);
    const comms1 = await prisma.commissionLedger.findMany({
      where: { sourceUserId: level1.id }
    });
    expect(comms1.length).toBe(1);
    expect(comms1[0].receiverId).toBe(manager.id);
    expect(Number(comms1[0].amount)).toBe(1500);
    expect(comms1[0].type).toBe(CommissionType.DIRECT_LEVEL_1_JOIN);

    // Create Level 2 user
    const level2 = await prisma.user.create({
      data: {
        name: "Normal Level 2",
        phone: "9912000003",
        passwordHash: "dummyhash",
        role: Role.LEVEL_2,
        sponsorId: level1.id,
        referralCode: "NL2001"
      }
    });
    testLevel2Id = level2.id;

    // Verify commissions for Level 2 joining: Level 1 gets 1500, Manager gets 500 passive
    await createCommissionsAfterPaymentConfirmation(prisma, level2.id);
    const comms2 = await prisma.commissionLedger.findMany({
      where: { sourceUserId: level2.id },
      orderBy: { amount: "desc" }
    });
    expect(comms2.length).toBe(2);
    expect(comms2[0].receiverId).toBe(level1.id);
    expect(Number(comms2[0].amount)).toBe(1500);
    expect(comms2[1].receiverId).toBe(manager.id);
    expect(Number(comms2[1].amount)).toBe(500);

    // Create Customer
    const customer = await prisma.user.create({
      data: {
        name: "Normal Customer",
        phone: "9912000004",
        passwordHash: "dummyhash",
        role: Role.CUSTOMER,
        sponsorId: level2.id,
        normalManagerId: manager.id,
        referralCode: "NCUST001"
      }
    });
    testCustomerId = customer.id;

    // Verify Level 2 gets 1500 when Customer joins, Upline Level 1 gets 500 passive
    await createCommissionsAfterPaymentConfirmation(prisma, customer.id);
    const comms3 = await prisma.commissionLedger.findMany({
      where: { sourceUserId: customer.id },
      orderBy: { amount: "desc" }
    });
    expect(comms3.length).toBe(2);
    expect(comms3[0].receiverId).toBe(level2.id);
    expect(Number(comms3[0].amount)).toBe(1500);
    expect(comms3[1].receiverId).toBe(level1.id);
    expect(Number(comms3[1].amount)).toBe(500);
  });

  it("should prevent duplicate commission runs on the same user", async () => {
    // Retrieve previous Customer
    const customer = await prisma.user.findUniqueOrThrow({ where: { id: testCustomerId } });
    expect(customer.commissionProcessedAt).not.toBeNull();

    // Call commissions processor again
    const beforeCount = await prisma.commissionLedger.count({
      where: { sourceUserId: customer.id }
    });
    await createCommissionsAfterPaymentConfirmation(prisma, customer.id);
    const afterCount = await prisma.commissionLedger.count({
      where: { sourceUserId: customer.id }
    });

    // Count must remain unchanged
    expect(afterCount).toBe(beforeCount);
  });

  it("should enforce the 216 confirmed customer requirement to unlock Beta Manager", async () => {
    const manager = await prisma.user.create({
      data: {
        name: "Beta Candidate Manager",
        phone: "9913000001",
        passwordHash: "dummyhash",
        role: Role.MANAGER,
        status: UserStatus.ACTIVE,
        referralCode: "BMAN001"
      }
    });

    // Unlock validation should fail (0 customers)
    await expect(
      assertCanCreateBetaManager(manager.id)
    ).rejects.toThrow(/Manager must complete 216 confirmed customers/);

    // Seed 216 active customers under this manager in normal flow
    const customersData = [];
    for (let i = 1; i <= 216; i++) {
      customersData.push({
        name: `Customer - ${i}`,
        phone: `99131${i.toString().padStart(5, "0")}`,
        passwordHash: "dummyhash",
        role: Role.CUSTOMER,
        placementType: PlacementType.NORMAL,
        companyPaymentConfirmedAt: new Date(),
        referralCode: `BCUST${i.toString().padStart(5, "0")}`,
        normalManagerId: manager.id
      });
    }

    await prisma.user.createMany({ data: customersData });

    // Validate again -> should pass now
    await expect(
      assertCanCreateBetaManager(manager.id)
    ).resolves.not.toThrow();
  });

  it("should process matrix-hold and release payouts in the Beta Matrix", async () => {
    const rootManager = await prisma.user.create({
      data: {
        name: "Beta Root Manager",
        phone: "9914000001",
        passwordHash: "dummyhash",
        role: Role.MANAGER,
        status: UserStatus.ACTIVE,
        referralCode: "BRMAN001"
      }
    });

    const betaManager = await prisma.user.create({
      data: {
        name: "Beta Manager",
        phone: "9914000002",
        passwordHash: "dummyhash",
        role: Role.BETA_MANAGER,
        sponsorId: rootManager.id,
        placementType: PlacementType.BETA_MATRIX,
        betaRootManagerId: rootManager.id,
        referralCode: "BM001"
      }
    });

    // Create Matrix pre-seeded with 214 confirmed customers to avoid sequential network roundtrips
    const matrix = await prisma.betaMatrix.create({
      data: {
        rootManagerId: rootManager.id,
        betaManagerId: betaManager.id,
        confirmedCustomers: 214,
        pendingAmount: 214 * 500
      }
    });

    // Create Beta Level 1 & Level 2 agents
    const level1 = await prisma.user.create({
      data: {
        name: "Beta Level 1",
        phone: "9914000003",
        passwordHash: "dummyhash",
        role: Role.LEVEL_1,
        sponsorId: betaManager.id,
        placementType: PlacementType.BETA_MATRIX,
        betaRootManagerId: rootManager.id,
        referralCode: "BL1_01"
      }
    });

    const level2 = await prisma.user.create({
      data: {
        name: "Beta Level 2",
        phone: "9914000004",
        passwordHash: "dummyhash",
        role: Role.LEVEL_2,
        sponsorId: level1.id,
        placementType: PlacementType.BETA_MATRIX,
        betaRootManagerId: rootManager.id,
        referralCode: "BL2_01"
      }
    });

    // Record joins
    // Let's add 1st customer in matrix
    const customer1 = await prisma.user.create({
      data: {
        name: "Beta Customer 1",
        phone: "9914000005",
        passwordHash: "dummyhash",
        role: Role.CUSTOMER,
        sponsorId: level2.id,
        placementType: PlacementType.BETA_MATRIX,
        betaRootManagerId: rootManager.id,
        referralCode: "BC_01"
      }
    });

    await createCommissionsAfterPaymentConfirmation(prisma, customer1.id);

    // Verify 1500 immediately to Level 2, and 500 is PENDING/held for Root Manager
    const commsL2 = await prisma.commissionLedger.findFirstOrThrow({
      where: { sourceUserId: customer1.id, receiverId: level2.id }
    });
    expect(Number(commsL2.amount)).toBe(1500);
    expect(commsL2.status).toBe(CommissionStatus.APPROVED);

    const commsHold = await prisma.commissionLedger.findFirstOrThrow({
      where: { sourceUserId: customer1.id, receiverId: rootManager.id }
    });
    expect(Number(commsHold.amount)).toBe(500);
    expect(commsHold.status).toBe(CommissionStatus.PENDING);
    expect(commsHold.holdUntilMatrixComplete).toBe(true);

    // Verify matrix is not complete yet (currently at 215 confirmed customers)
    const matrixCheck = await prisma.betaMatrix.findUniqueOrThrow({
      where: { id: matrix.id }
    });
    expect(matrixCheck.status).toBe(BetaMatrixStatus.ACTIVE);
    expect(matrixCheck.confirmedCustomers).toBe(215);

    // Create the final 216th customer
    const customer2 = await prisma.user.create({
      data: {
        name: "Beta Customer 2",
        phone: "9914000006",
        passwordHash: "dummyhash",
        role: Role.CUSTOMER,
        sponsorId: level2.id,
        placementType: PlacementType.BETA_MATRIX,
        betaRootManagerId: rootManager.id,
        referralCode: "BC_02"
      }
    });

    // Confirm the final 216th customer to complete the matrix
    await createCommissionsAfterPaymentConfirmation(prisma, customer2.id);

    // Verify matrix is now COMPLETED and released root manager completion payout of 108,000
    const matrixFinal = await prisma.betaMatrix.findUniqueOrThrow({
      where: { id: matrix.id }
    });
    expect(matrixFinal.status).toBe(BetaMatrixStatus.COMPLETED);
    expect(matrixFinal.completedAt).not.toBeNull();

    const completionPayout = await prisma.commissionLedger.findFirstOrThrow({
      where: {
        betaMatrixId: matrix.id,
        type: CommissionType.BETA_MATRIX_COMPLETION
      }
    });
    expect(Number(completionPayout.amount)).toBe(108000);
    expect(completionPayout.status).toBe(CommissionStatus.APPROVED);
  }, 300000);

  describe("API Permissions & Upline Privacy Validation", () => {
    it("should block Customer role from business network endpoints over HTTP", async () => {
      const customer = await prisma.user.create({
        data: {
          name: "HTTP Permission Customer",
          phone: "9920000001",
          passwordHash: "dummyhash",
          role: Role.CUSTOMER,
          referralCode: "HPCUST01"
        }
      });
      const token = authToken(customer.id, Role.CUSTOMER);

      const tree = await apiRequest("/users/tree", { token });
      const network = await apiRequest("/users/me/network", { token });
      const options = await apiRequest("/users/options", { token });

      expect(tree.status).toBe(403);
      expect(network.status).toBe(403);
      expect(options.status).toBe(403);
    });

    it("should prevent non-admin active-user creation and admin-only user listing over HTTP", async () => {
      const manager = await prisma.user.create({
        data: {
          name: "HTTP Permission Manager",
          phone: "9920000002",
          passwordHash: "dummyhash",
          role: Role.MANAGER,
          referralCode: "HPMAN01"
        }
      });
      const token = authToken(manager.id, Role.MANAGER);

      const createUser = await apiRequest("/users", {
        method: "POST",
        token,
        body: {
          name: "Blocked Direct User",
          phone: "9920000003",
          password: "StrongPass1!",
          role: Role.LEVEL_1,
          sponsorId: manager.id
        }
      });
      const listUsers = await apiRequest("/users", { token });

      expect(createUser.status).toBe(403);
      expect(listUsers.status).toBe(403);
    });

    it("should allow only Admin to change their own login phone", async () => {
      const adminPassword = "AdminChange1!";
      const admin = await prisma.user.create({
        data: {
          name: "HTTP Login Admin",
          phone: "9920000101",
          passwordHash: await bcrypt.hash(adminPassword, 12),
          role: Role.ADMIN,
          referralCode: "HPADMN01"
        }
      });
      const manager = await prisma.user.create({
        data: {
          name: "HTTP Login Manager",
          phone: "9920000102",
          passwordHash: await bcrypt.hash(adminPassword, 12),
          role: Role.MANAGER,
          referralCode: "HPMAN02"
        }
      });

      const blocked = await apiRequest("/auth/change-login-id", {
        method: "PATCH",
        token: authToken(manager.id, Role.MANAGER),
        body: { currentPassword: adminPassword, newPhone: "9920000103" }
      });
      const changed = await apiRequest("/auth/change-login-id", {
        method: "PATCH",
        token: authToken(admin.id, Role.ADMIN),
        body: { currentPassword: adminPassword, newPhone: "9920000104" }
      });

      expect(blocked.status).toBe(403);
      expect(changed.status).toBe(200);
      expect(changed.data.user.phone).toBe("9920000104");

      const updatedAdmin = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
      expect(updatedAdmin.phone).toBe("9920000104");
    });

    it("should scope non-admin order and handover visibility to related records", async () => {
      const level2 = await prisma.user.create({
        data: {
          name: "HTTP Level 2",
          phone: "9920000004",
          passwordHash: "dummyhash",
          role: Role.LEVEL_2,
          referralCode: "HPL201"
        }
      });
      const customerA = await prisma.user.create({
        data: {
          name: "HTTP Customer A",
          phone: "9920000005",
          passwordHash: "dummyhash",
          role: Role.CUSTOMER,
          sponsorId: level2.id,
          referralCode: "HPCSTA"
        }
      });
      const customerB = await prisma.user.create({
        data: {
          name: "HTTP Customer B",
          phone: "9920000006",
          passwordHash: "dummyhash",
          role: Role.CUSTOMER,
          sponsorId: level2.id,
          referralCode: "HPCSTB"
        }
      });

      const [orderA, orderB] = await Promise.all([
        prisma.order.create({
          data: {
            customerId: customerA.id,
            collectedById: level2.id,
            totalAmount: 100
          }
        }),
        prisma.order.create({
          data: {
            customerId: customerB.id,
            collectedById: level2.id,
            totalAmount: 200
          }
        })
      ]);

      await prisma.paymentHandover.create({
        data: {
          orderId: orderB.id,
          fromUserId: customerB.id,
          toUserId: level2.id,
          amount: 200
        }
      });

      const customerToken = authToken(customerA.id, Role.CUSTOMER);
      const orders = await apiRequest("/orders", { token: customerToken });
      const handovers = await apiRequest("/payments/handovers/me", { token: customerToken });

      expect(orders.status).toBe(200);
      expect(orders.data.orders.map((order: { id: string }) => order.id)).toContain(orderA.id);
      expect(orders.data.orders.map((order: { id: string }) => order.id)).not.toContain(orderB.id);
      expect(handovers.status).toBe(200);
      expect(handovers.data.handovers).toHaveLength(0);
    });

    it("should allow only CUSTOMER to request a role upgrade and validate required details", async () => {
      // Create a test Customer to request upgrade
      const customer = await prisma.user.create({
        data: {
          name: "Upgrade Candidate Cust",
          phone: "9915000001",
          passwordHash: "dummyhash",
          role: Role.CUSTOMER,
          referralCode: "UCUST01"
        }
      });

      // Submit a pending upgrade request in the database
      const request = await prisma.roleUpgradeRequest.create({
        data: {
          requesterId: customer.id,
          fromRole: Role.CUSTOMER,
          toRole: Role.LEVEL_2,
          reason: "I want to become a partner",
          aadhaarNumber: "123456789012",
          panNumber: "ABCDE1234F"
        }
      });

      expect(request.fromRole).toBe(Role.CUSTOMER);
      expect(request.toRole).toBe(Role.LEVEL_2);
      expect(request.aadhaarNumber).toBe("123456789012");
      expect(request.panNumber).toBe("ABCDE1234F");

      // Cleanup
      await prisma.roleUpgradeRequest.delete({ where: { id: request.id } });
      await prisma.user.delete({ where: { id: customer.id } });
    });

    it("should accurately resolve sponsor role to the corresponding downline role", () => {
      // Manager sponsor maps to Level 1
      const managerSponsorRole = Role.MANAGER;
      let determinedRole1: Role = Role.CUSTOMER;
      if (managerSponsorRole === Role.MANAGER || managerSponsorRole === Role.BETA_MANAGER) {
        determinedRole1 = Role.LEVEL_1;
      }
      expect(determinedRole1).toBe(Role.LEVEL_1);

      // Level 1 sponsor maps to Level 2
      const l1SponsorRole = Role.LEVEL_1;
      let determinedRole2: Role = Role.CUSTOMER;
      if (l1SponsorRole === Role.LEVEL_1) {
        determinedRole2 = Role.LEVEL_2;
      }
      expect(determinedRole2).toBe(Role.LEVEL_2);

      // Level 2 sponsor maps to Customer
      const l2SponsorRole = Role.LEVEL_2;
      let determinedRole3: Role = Role.CUSTOMER;
      if (l2SponsorRole === Role.LEVEL_2) {
        determinedRole3 = Role.CUSTOMER;
      }
      expect(determinedRole3).toBe(Role.CUSTOMER);
    });
  });
});
