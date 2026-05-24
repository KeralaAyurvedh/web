import { Router } from "express";
import { ProductAvailability, Role } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireRoles } from "../middlewares/auth";
import { createCommissionsAfterPaymentConfirmation } from "../services/commissionRules";
import { prisma } from "../utils/prisma";
import { writeAuditLog } from "../utils/audit";

export const ordersRouter = Router();

const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.coerce.number().int().positive()
    })
  ).min(1),
  notes: z.string().optional()
});

ordersRouter.get("/", requireAuth, async (req, res) => {
  const actor = req.user!;
  const orders = await prisma.order.findMany({
    where: actor.role === Role.ADMIN
      ? {}
      : {
          OR: [
            { customerId: actor.id },
            { collectedById: actor.id }
          ]
        },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          role: true
        }
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ orders });
});

ordersRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid order details", details: parsed.error.flatten() });
  }

  const customer = await prisma.user.findUnique({ where: { id: parsed.data.customerId } });
  if (!customer || customer.role !== Role.CUSTOMER) {
    return res.status(400).json({ error: "Order customer must be a Customer user" });
  }

  if (req.user!.role !== Role.ADMIN && req.user!.id !== customer.id && req.user!.id !== customer.sponsorId) {
    return res.status(403).json({ error: "Only the Customer, their Level 2 Agent, or Admin can create this order" });
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: parsed.data.items.map((item) => item.productId) },
      isActive: true
    }
  });

  if (products.length !== parsed.data.items.length) {
    return res.status(400).json({ error: "One or more products are invalid" });
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  for (const item of parsed.data.items) {
    const product = productById.get(item.productId)!;
    if (product.availability === ProductAvailability.COMING_SOON) {
      return res.status(400).json({ error: `${product.name} is coming soon and cannot be ordered` });
    }
    if (product.stock < item.quantity) {
      return res.status(400).json({ error: `${product.name} is out of stock` });
    }
  }

  const orderItems = parsed.data.items.map((item) => {
    const product = productById.get(item.productId)!;
    const unitPrice = product.price;
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice,
      lineTotal: Number(unitPrice) * item.quantity
    };
  });

  const totalAmount = orderItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);

  try {
    const order = await prisma.$transaction(async (tx) => {
    for (const item of parsed.data.items) {
      const product = productById.get(item.productId)!;
      const updated = await tx.product.updateMany({
        where: {
          id: item.productId,
          isActive: true,
          availability: ProductAvailability.AVAILABLE,
          stock: { gte: item.quantity }
        },
        data: { stock: { decrement: item.quantity } }
      });

      if (updated.count !== 1) {
        throw new Error(`${product.name} does not have enough available stock`);
      }
    }

    return tx.order.create({
      data: {
        customerId: customer.id,
        collectedById: customer.sponsorId,
        totalAmount,
        notes: parsed.data.notes,
        items: {
          create: orderItems
        }
      },
      include: { items: true }
    });
  });

    await writeAuditLog({
      actorId: req.user!.id,
      action: "ORDER_CREATED",
      entityType: "Order",
      entityId: order.id,
      metadata: { customerId: customer.id, totalAmount }
    });

    return res.status(201).json({ order });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "Could not create order" });
  }
});

ordersRouter.post("/:id/confirm-company-payment", requireAuth, requireRoles(Role.ADMIN), async (req, res) => {
  const orderId = String(req.params.id);

  const order = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: "MONEY_RECEIVED_BY_COMPANY",
        paymentStatus: "RECEIVED_BY_COMPANY"
      }
    });

    await createCommissionsAfterPaymentConfirmation(tx, updatedOrder.customerId);

    return updatedOrder;
  });

  await writeAuditLog({
    actorId: req.user!.id,
    action: "COMPANY_PAYMENT_CONFIRMED",
    entityType: "Order",
    entityId: order.id
  });

  return res.json({ order });
});
