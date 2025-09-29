// src/lib/schema/productImageSchema.ts
import { z } from "zod";

export const productImageSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional(),
  image_url: z.string().url("Invalid image URL"),
  alt_text: z.string().optional(),
  sort_order: z.number().optional(),
  is_primary: z.boolean().default(false),
});

export type ProductImageType = z.infer<typeof productImageSchema>;
