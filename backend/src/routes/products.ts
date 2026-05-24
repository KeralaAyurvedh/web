import { Router } from "express";
import { ProductAvailability, Role } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireRoles } from "../middlewares/auth";
import { prisma } from "../utils/prisma";

export const productsRouter = Router();

const productSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2).default("Wellness"),
  description: z.string().min(2),
  shortDescription: z.string().optional().default(""),
  fullDescription: z.string().optional().default(""),
  usageInstructions: z.string().optional().default(""),
  benefits: z.string().optional().default(""),
  size: z.string().optional().default(""),
  price: z.coerce.number().positive(),
  imageUrl: z.string().trim().optional().transform((value) => value === "" ? undefined : value).pipe(z.string().url().optional()),
  stock: z.coerce.number().int().min(0).default(0),
  availability: z.enum(ProductAvailability).default(ProductAvailability.AVAILABLE),
  isActive: z.boolean().optional()
});

productsRouter.get("/", requireAuth, async (req, res) => {
  const products = await prisma.product.findMany({
    where: req.user!.role === Role.ADMIN ? {} : { isActive: true },
    orderBy: { createdAt: "desc" }
  });

  return res.json({
    products: products.map((product) => ({
      ...product,
      stock: req.user!.role === Role.ADMIN ? product.stock : undefined,
      availability: product.availability === ProductAvailability.AVAILABLE && product.stock <= 0
        ? ProductAvailability.OUT_OF_STOCK
        : product.availability
    }))
  });
});

productsRouter.get("/:id", requireAuth, async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: String(req.params.id) }
  });

  if (!product || (req.user!.role !== Role.ADMIN && !product.isActive)) {
    return res.status(404).json({ error: "Product not found" });
  }

  return res.json({
    product: {
      ...product,
      stock: req.user!.role === Role.ADMIN ? product.stock : undefined,
      availability: product.availability === ProductAvailability.AVAILABLE && product.stock <= 0
        ? ProductAvailability.OUT_OF_STOCK
        : product.availability
    }
  });
});

productsRouter.post("/", requireAuth, requireRoles(Role.ADMIN), async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid product details", details: parsed.error.flatten() });
  }

  const product = await prisma.product.create({
    data: {
      ...parsed.data,
      createdById: req.user!.id
    }
  });

  return res.status(201).json({ product });
});

productsRouter.put("/:id", requireAuth, requireRoles(Role.ADMIN), async (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid product details", details: parsed.error.flatten() });
  }

  const product = await prisma.product.update({
    where: { id: String(req.params.id) },
    data: parsed.data
  });

  return res.json({ product });
});

productsRouter.delete("/:id", requireAuth, requireRoles(Role.ADMIN), async (req, res) => {
  const product = await prisma.product.update({
    where: { id: String(req.params.id) },
    data: { isActive: false }
  });

  return res.json({ product });
});
