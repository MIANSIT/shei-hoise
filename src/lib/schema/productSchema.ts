import { z } from "zod";
import {
  variantSchema,
  ProductVariantType as VariantType,
} from "./varientSchema";
export const productSchema = z.object({
  store_id: z.string().uuid(),
  category_id: z.string().uuid().optional(),
  name: z.string().min(1, "Product name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  short_description: z.string().optional(),
  base_price: z.number().min(0, "Base price must be greater than 0"),
  weight: z.number().optional(),
  sku: z.string().optional(),
  tp_price: z.number().optional(),
  discounted_price: z.number().optional(),
  discount_amount: z.number().optional(),
  stock: z
    .number()
    .min(0, "Stock must be greater than or equal to 0")
    .default(0),

  // New fields
  dimensions: z.string().optional(),
  is_digital: z.boolean().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  featured: z.boolean().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),

  variants: z.array(variantSchema).optional(),
  images: z
    .array(
      z.object({
        imageUrl: z.string().url(),
        altText: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .optional(),
});

export type ProductType = z.infer<typeof productSchema>;
export type ProductVariantType = VariantType;
export type CreateProductType = Omit<ProductType, "id">;
