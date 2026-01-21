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
    discounted_price: z.number().optional(),
    discount_amount: z.number().optional(),
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
  });

export type ProductVariantType = z.infer<typeof variantSchema>;
