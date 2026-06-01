import { Router } from "express";
import { FileAssetCategory, ProductAvailability, Role } from "@prisma/client";
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
  imageUrl: z.string().trim().optional().transform((value) => value === "" ? undefined : value),
  stock: z.coerce.number().int().min(0).default(0),
  availability: z.enum(ProductAvailability).default(ProductAvailability.AVAILABLE),
  isActive: z.boolean().optional()
});

productsRouter.get("/", requireAuth, async (req, res) => {
  const products = await prisma.product.findMany({
    where: req.user!.role === Role.ADMIN ? {} : { isActive: true },
    orderBy: { createdAt: "desc" }
  });
  const productImageFiles = await prisma.fileAsset.findMany({
    where: {
      category: FileAssetCategory.PRODUCT_IMAGE,
      relatedEntityType: "Product",
      relatedEntityId: { in: products.map((product) => product.id) }
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, relatedEntityId: true }
  });
  const imageFileByProductId = new Map<string, string>();
  for (const file of productImageFiles) {
    if (file.relatedEntityId && !imageFileByProductId.has(file.relatedEntityId)) {
      imageFileByProductId.set(file.relatedEntityId, file.id);
    }
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const formatImageUrl = (productId: string, url?: string | null) => {
    const fileId = imageFileByProductId.get(productId);
    if (fileId) return `${baseUrl}/files/${fileId}/raw`;
    if (!url) return url;
    if (url.startsWith("http")) return url;
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    return `${baseUrl}${cleanUrl}`;
  };

  return res.json({
    products: products.map((product) => ({
      ...product,
      imageUrl: formatImageUrl(product.id, product.imageUrl),
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
  const productImageFile = await prisma.fileAsset.findFirst({
    where: {
      category: FileAssetCategory.PRODUCT_IMAGE,
      relatedEntityType: "Product",
      relatedEntityId: product.id
    },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const formatImageUrl = (url?: string | null) => {
    if (productImageFile) return `${baseUrl}/files/${productImageFile.id}/raw`;
    if (!url) return url;
    if (url.startsWith("http")) return url;
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    return `${baseUrl}${cleanUrl}`;
  };

  return res.json({
    product: {
      ...product,
      imageUrl: formatImageUrl(product.imageUrl),
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

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const formatImageUrl = (url?: string | null) => {
    if (!url) return url;
    if (url.startsWith("http")) return url;
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    return `${baseUrl}${cleanUrl}`;
  };

  return res.status(201).json({
    product: {
      ...product,
      imageUrl: formatImageUrl(product.imageUrl)
    }
  });
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

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const formatImageUrl = (url?: string | null) => {
    if (!url) return url;
    if (url.startsWith("http")) return url;
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    return `${baseUrl}${cleanUrl}`;
  };

  return res.json({
    product: {
      ...product,
      imageUrl: formatImageUrl(product.imageUrl)
    }
  });
});

productsRouter.delete("/:id", requireAuth, requireRoles(Role.ADMIN), async (req, res) => {
  const product = await prisma.product.update({
    where: { id: String(req.params.id) },
    data: { isActive: false }
  });

  return res.json({ product });
});
