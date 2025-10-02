import { z } from "zod";

export const variantSchema = z.object({
  product_id: z.string().uuid().optional(),
  variant_name: z.string().min(1, "Variant name is required"),
  sku: z.string().min(1, "SKU is required"),
  price: z.number().min(1, "Price must be greater than 0"),

  // Fixed: attributes can be null, undefined, or any key-value pair
  attributes: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .nullable()
    .optional(),

  weight: z.number().optional(),
  color: z.string().min(1, "Color is required"),
  is_active: z.boolean(),
  stock: z.number().min(1, "Stock must be 1 or greater"),
});

export type ProductVariantType = z.infer<typeof variantSchema>;
