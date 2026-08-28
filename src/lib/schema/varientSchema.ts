import { z } from "zod";

export const variantSchema = z
  .object({
    id: z.string().uuid().optional(),
    product_id: z.string().uuid().optional(),
    variant_name: z.string().min(1, "Variant name is required"),
    sku: z.string().optional(), // enforced in productSchema or superRefine

    attributes: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .nullable()
      .optional(),

    weight: z.number().optional(),
    color: z.string().optional(),
    is_active: z.boolean(),

    base_price: z.number().optional(),
    tp_price: z.number().optional(),
    // Nullable so clearing a variant's discount can send an explicit null and
    // actually wipe the stored sale price (see calculateDiscountedPrice).
    discounted_price: z.number().nullable().optional(),
    discount_amount: z.number().nullable().optional(),
    // Optional flash-sale window around discounted_price — both null means
    // the discount is always active (see getEffectivePrice).
    sale_starts_at: z.string().nullable().optional(),
    sale_ends_at: z.string().nullable().optional(),
    stock: z.number().optional(),

    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Discount consistency per variant
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

    // Flash-sale window consistency per variant
    if (data.sale_ends_at && !data.sale_starts_at) {
      ctx.addIssue({
        code: "custom",
        message: "Sale start date is required when an end date is set.",
        path: ["sale_starts_at"],
      });
    }
    if (
      data.sale_starts_at &&
      data.sale_ends_at &&
      new Date(data.sale_ends_at) <= new Date(data.sale_starts_at)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Sale end date must be after the start date.",
        path: ["sale_ends_at"],
      });
    }
  });

export type ProductVariantType = z.infer<typeof variantSchema>;
