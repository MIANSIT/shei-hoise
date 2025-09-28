import { z } from "zod";
import { variantSchema } from "./varientSchema";

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
    sku: z.string().min(1, "SKU is required"),

    stock: z.number().min(1, "Stock must be 1 or greater"),

    dimensions: z.string().optional(),
    is_digital: z.boolean().optional(),
    status: z.string().optional(),
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
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (!data.variants || data.variants.length === 0) &&
      (!data.stock || data.stock <= 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Stock must be greater than 0 if there are no variants.",
        path: ["stock"],
      });
    }
  });

export type ProductType = z.infer<typeof productSchema>;
