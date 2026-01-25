import { z } from "zod";
import { variantSchema } from "./varientSchema";

export const productUpdateSchema = z
  .object({
    id: z.string().uuid(),
    store_id: z.string().uuid(),
    category_id: z.string().nullable().optional(),
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    description: z.string().optional(),
    short_description: z.string().optional(),
    base_price: z.number().optional(),
    tp_price: z.number().optional(),
    discounted_price: z.number().optional().nullable(),
    discount_amount: z.number().optional().nullable(),
    weight: z.number().optional(),
    sku: z.string().optional(),
    stock: z.number().optional(),
    dimensions: z.string().optional().nullable(),
    is_digital: z.boolean().optional(),
    status: z.enum(["draft", "active", "inactive", "archived"]).optional(),
    featured: z.boolean().optional(),
    meta_title: z.string().optional().nullable(),
    meta_description: z.string().optional().nullable(),
    variants: z.array(variantSchema).optional(),
    images: z
      .array(
        z.object({
          id: z.string().uuid().optional(),
          imageUrl: z.string().url(),
          altText: z.string().optional(),
          isPrimary: z.boolean().optional(),
          variantId: z.string().uuid().optional(),
        })
      )
      .max(5)
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasVariants = data.variants && data.variants.length > 0;

    if (!hasVariants) {
      if (!data.base_price)
        ctx.addIssue({
          code: "custom",
          message: "Base price required",
          path: ["base_price"],
        });
      if (!data.tp_price)
        ctx.addIssue({
          code: "custom",
          message: "TP price required",
          path: ["tp_price"],
        });
      if (!data.sku)
        ctx.addIssue({
          code: "custom",
          message: "SKU required",
          path: ["sku"],
        });
      if (data.stock !== undefined && data.stock < 0)
        ctx.addIssue({
          code: "custom",
          message: "Stock cannot be negative",
          path: ["stock"],
        });
    }

    if (data.discount_amount && data.discounted_price) {
      const expected = (data.base_price ?? 0) - data.discount_amount;
      if (data.discounted_price !== expected) {
        ctx.addIssue({
          code: "custom",
          message: `Discounted price should be base_price - discount_amount (${expected})`,
          path: ["discounted_price"],
        });
      }
    }

    // if (data.images && !data.images.some((img) => img.isPrimary)) {
    //   ctx.addIssue({
    //     code: "custom",
    //     message: "At least one image must be primary",
    //     path: ["images"],
    //   });
    // }
  });

export type ProductUpdateType = z.infer<typeof productUpdateSchema>;
