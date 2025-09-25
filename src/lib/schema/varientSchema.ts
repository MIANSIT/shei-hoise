import { z } from "zod";

export const variantSchema = z.object({
  product_id: z.string().uuid().optional(),
  variant_name: z.string().min(1, "Variant name is required"),
  sku: z.string().optional(),
  price: z.number().min(0, "Price must be greater than 0"),
  attributes: z.record(z.string(), z.string()).optional(),
  weight: z.number().optional(),
  color: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type ProductVariantType = z.infer<typeof variantSchema>;
