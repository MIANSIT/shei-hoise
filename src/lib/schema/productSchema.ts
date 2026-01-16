import { z } from "zod";
import {
  variantSchema,
  ProductVariantType as VariantType,
} from "./varientSchema";

export const productSchema = z
  .object({
    id: z.string().uuid().optional(),
    store_id: z.string().uuid(),
    category_id: z
      .string()
      .nullable()
      .refine((val) => val !== null && val !== "", {
        message: "Category is required",
      }),
    name: z.string().min(1, "Product name is required"),
    slug: z.string().min(1, "Slug is required"),
    description: z.string().min(1, "Description is required"),
    short_description: z.string().optional(),

    base_price: z.number().optional(),
    tp_price: z.number().optional(),
    discounted_price: z.number().optional().nullable(),
    discount_amount: z.number().optional().nullable(),
    weight: z.number().optional().nullable(),
    sku: z.string().optional(), // enforced conditionally
    stock: z.number().optional(),

    dimensions: z.string().optional().nullable(),
    is_digital: z.boolean().optional(),
    status: z.enum(["draft", "active", "inactive", "archived"]),
    featured: z.boolean(),
    meta_title: z.string().optional().nullable(),
    meta_description: z.string().optional().nullable(),

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
  })
  .superRefine((data, ctx) => {
    const hasVariants = data.variants && data.variants.length > 0;

    if (hasVariants) {
      data.variants?.forEach((variant, index) => {
        if (!variant.base_price) {
          ctx.addIssue({
            code: "custom",
            message: "Base price is required for each variant.",
            path: ["variants", index, "base_price"],
          });
        }
        if (!variant.tp_price) {
          ctx.addIssue({
            code: "custom",
            message: "TP price is required for each variant.",
            path: ["variants", index, "tp_price"],
          });
        }
        if (variant.stock === undefined || variant.stock < 0) {
          ctx.addIssue({
            code: "custom",
            message: "Stock cannot be negative.",
            path: ["variants", index, "stock"],
          });
        }
        if (!variant.sku) {
          ctx.addIssue({
            code: "custom",
            message: "SKU is required for each variant.",
            path: ["variants", index, "sku"],
          });
        }
      });
    } else {
      if (!data.base_price) {
        ctx.addIssue({
          code: "custom",
          message: "Base price is required when no variants exist.",
          path: ["base_price"],
        });
      }
      if (!data.tp_price) {
        ctx.addIssue({
          code: "custom",
          message: "TP price is required when no variants exist.",
          path: ["tp_price"],
        });
      }
      if (!data.sku) {
        ctx.addIssue({
          code: "custom",
          message: "SKU is required when no variants exist.",
          path: ["sku"],
        });
      }
      if (data.stock === undefined || data.stock < 0) {
        ctx.addIssue({
          code: "custom",
          message: "Stock cannot be negative ",
          path: ["stock"],
        });
      }
    }

    // Discount validation
    if (data.discount_amount && data.discounted_price) {
      const expected = (data.base_price ?? 0) - data.discount_amount;
      if (data.discounted_price !== expected) {
        ctx.addIssue({
          code: "custom",
          message: `Discounted price should be base_price - discount_amount (${expected}).`,
          path: ["discounted_price"],
        });
      }
    }

    if (
      data.base_price !== undefined &&
      data.tp_price !== undefined &&
      data.base_price < data.tp_price
    ) {
      ctx.addIssue({
        code: "custom",
        message: "MRP Price must be greater than or equal to TP price.",
        path: ["base_price"],
      });
    }

    // Image validation
    if (!data.images || data.images.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "At least one image is required.",
        path: ["images"],
      });
    } else if (!data.images.some((img) => img.isPrimary)) {
      ctx.addIssue({
        code: "custom",
        message: "At least one image must be marked as primary.",
        path: ["images"],
      });
    }
  });

export type ProductType = z.infer<typeof productSchema>;
export type ProductVariantType = VariantType;
export type CreateProductType = Omit<ProductType, "id">;
