import { z } from "zod";
import { variantSchema, ProductVariantType as VariantType } from "./varientSchema";

export const productSchema = z.object({
  store_id: z.string().uuid(),
  category_id: z.string().uuid().optional(),
  name: z.string().min(1, "Product name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  basePrice: z.number().min(0, "Base price must be greater than 0"),
  weight: z.number().optional(),
  sku: z.string().optional(),
  tpPrice: z.number().optional(),
  discountedPrice: z.number().optional(),
  discountAmount: z.number().optional(),
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
