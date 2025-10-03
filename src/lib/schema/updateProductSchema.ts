// src/lib/schema/updateProductSchema.ts
import { z } from "zod";
import { variantSchema } from "./varientSchema";

export const updateProductSchema = z.object({
  id: z.string().uuid(), // required to identify the product

  store_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),

  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),

  description: z.string().optional(),
  short_description: z.string().optional(),

  base_price: z.number().min(1).optional(),
  tp_price: z.number().min(1).optional(),

  discounted_price: z.number().optional(),
  discount_amount: z.number().optional(),
  weight: z.number().optional(),
  sku: z.string().optional(),

  stock: z.number().min(0).optional(),

  dimensions: z.string().optional(),
  is_digital: z.boolean().optional(),
  status: z.enum(["draft", "active", "inactive", "archived"]).optional(),
  featured: z.boolean().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),

  variants: z.array(variantSchema).optional(),

  images: z
    .array(
      z.object({
        imageUrl: z.string().url("Invalid image URL"),
        altText: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .max(5, "Maximum 5 images are allowed")
    .optional(),
});

export type UpdateProductType = z.infer<typeof updateProductSchema>;
