import { z } from "zod";

// Variant schema
const productVariantSchema = z.object({
  variant_name: z.string(),
  sku: z.string(),
  price: z.number(),
  attributes: z.record(z.string(), z.string()), // values must be strings
  weight: z.number().optional(),
});

// Image schema
const productImageSchema = z.object({
  image_url: z.string().url(),
  alt_text: z.string().optional(),
  is_primary: z.boolean().optional(),
});

// Main product schema
export const createProductSchema = z.object({
  store_id: z.string().uuid(),
  category_id: z.string().uuid().optional(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  base_price: z.number(),
  sku: z.string().optional(),
  weight: z.number().optional(),
  dimensions: z.record(z.string(), z.number()).optional(), // { length, width, height }
  is_digital: z.boolean().optional(),
  status: z.enum(["draft", "active", "inactive", "archived"]).optional(),
  featured: z.boolean().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  variants: z.array(productVariantSchema).optional(),
  images: z.array(productImageSchema).optional(),
});

// 🔹 Types
export type ProductVariantType = z.infer<typeof productVariantSchema>;
export type ProductImageType = z.infer<typeof productImageSchema>;
export type CreateProductType = z.infer<typeof createProductSchema>;
