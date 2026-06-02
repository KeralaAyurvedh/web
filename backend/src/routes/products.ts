import { Router } from "express";
import { FileAssetCategory, ProductAvailability, Role } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireRoles } from "../middlewares/auth";
import { prisma } from "../utils/prisma";

export const productsRouter = Router();

const PRODUCT_LIST_CACHE_TTL_MS = 60_000;
type ProductListCacheEntry = {
  expiresAt: number;
  payload: unknown;
};
const productListCache = new Map<string, ProductListCacheEntry>();

export function invalidateProductListCache() {
  productListCache.clear();
}

function isValidProductImageUrl(value: string) {
  if (!value) return true;
  if (value.startsWith("/uploads/") || value.startsWith("/files/")) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return /\.(jpe?g|png|webp)$/i.test(url.pathname) || url.pathname.startsWith("/uploads/") || url.pathname.startsWith("/files/");
  } catch {
    return false;
  }
}

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
  discountPrice: z.coerce.number().positive().optional(),
  imageUrl: z.string().trim().optional()
    .transform((value) => value === "" ? undefined : value)
    .refine((value) => !value || isValidProductImageUrl(value), "Image URL must be a direct JPG, PNG, WebP, /uploads, or /files URL"),
  stock: z.coerce.number().int().min(0).default(0),
  availability: z.enum(ProductAvailability).default(ProductAvailability.AVAILABLE),
  isActive: z.boolean().optional()
});

productsRouter.get("/", requireAuth, async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const cacheKey = `${req.user!.role === Role.ADMIN ? "admin" : "public"}:${baseUrl}`;
  const cached = productListCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.payload);
  }

  const products = await prisma.product.findMany({
    where: req.user!.role === Role.ADMIN ? {} : { isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      shortDescription: true,
      fullDescription: true,
      usageInstructions: true,
      benefits: true,
      size: true,
      price: true,
      discountPrice: true,
      imageUrl: true,
      stock: true,
      availability: true,
      isActive: true,
      createdById: true,
      createdAt: true,
      updatedAt: true
    }
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

  const formatImageUrl = (productId: string, url?: string | null) => {
    const fileId = imageFileByProductId.get(productId);
    if (fileId) return `${baseUrl}/files/${fileId}/raw`;
    if (!url) return url;
    if (url.startsWith("http")) return url;
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    return `${baseUrl}${cleanUrl}`;
  };

  const payload = {
    products: products.map((product) => ({
      ...product,
      imageUrl: formatImageUrl(product.id, product.imageUrl),
      stock: req.user!.role === Role.ADMIN ? product.stock : undefined,
      availability: product.availability === ProductAvailability.AVAILABLE && product.stock <= 0
        ? ProductAvailability.OUT_OF_STOCK
        : product.availability
    }))
  };

  productListCache.set(cacheKey, {
    expiresAt: Date.now() + PRODUCT_LIST_CACHE_TTL_MS,
    payload
  });

  return res.json(payload);
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
  invalidateProductListCache();

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
  invalidateProductListCache();

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
  invalidateProductListCache();

  return res.json({ product });
});
