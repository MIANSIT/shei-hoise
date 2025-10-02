import { z } from "zod";
import {
  variantSchema,
  ProductVariantType as VariantType,
} from "./varientSchema";

export const productSchema = z
  .object({
    store_id: z.string().uuid(),
    category_id: z.string().uuid().optional(),

    name: z.string().min(1, "Product name is required"),
    slug: z.string().min(1, "Slug is required"),

    description: z.string().min(1, "Description is required"),
    short_description: z.string().optional(),

    base_price: z.number().min(1, "Base price must be greater than 0"),
    tp_price: z.number().min(1, "TP price must be greater than 0"),

    discounted_price: z.number().optional(),
    discount_amount: z.number().optional(),
    weight: z.number().optional(),
    sku: z.string().min(1, "SKU is required"), // main product SKU

    stock: z.number().min(0, "Stock cannot be negative"),

    dimensions: z.string().optional(),
    is_digital: z.boolean().optional(),
    status: z.enum(["draft", "active", "inactive", "archived"]),
    featured: z.boolean(),
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
      .min(1, "At least one image is required")
      .max(5, "Maximum 5 images are allowed")
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Stock check when no variants
    if ((!data.variants || data.variants.length === 0) && data.stock <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Stock must be greater than 0 if there are no variants.",
        path: ["stock"],
      });
    }

    // Discount consistency check
    if (data.discount_amount && data.discounted_price) {
      const expectedPrice = data.base_price - data.discount_amount;
      if (data.discounted_price !== expectedPrice) {
        ctx.addIssue({
          code: "custom",
          message: `Discounted price should be base_price - discount_amount (${expectedPrice}).`,
          path: ["discounted_price"],
        });
      }
    }
  });

export type ProductType = z.infer<typeof productSchema>;
export type ProductVariantType = VariantType;
