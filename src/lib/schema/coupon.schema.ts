import { z } from "zod";
import { CouponDiscountType } from "@/lib/types/enums";

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .min(3, "Code must be at least 3 characters")
      .max(50, "Code must be at most 50 characters")
      .regex(/^[A-Za-z0-9_-]+$/, "Code can only contain letters, numbers, - and _")
      .transform((val) => val.toUpperCase()),
    discount_type: z.nativeEnum(CouponDiscountType),
    discount_value: z.number().positive("Discount value must be positive"),
    min_order_amount: z.number().nonnegative().optional().nullable(),
    max_discount_amount: z.number().positive().optional().nullable(),
    max_uses: z.number().int().positive().optional().nullable(),
    max_uses_per_customer: z.number().int().positive().optional().nullable(),
    starts_at: z.string().optional().nullable(),
    ends_at: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.discount_type === CouponDiscountType.PERCENTAGE && data.discount_value > 100) {
      ctx.addIssue({
        code: "custom",
        message: "Percentage discount cannot exceed 100.",
        path: ["discount_value"],
      });
    }
    if (
      data.starts_at &&
      data.ends_at &&
      new Date(data.ends_at) <= new Date(data.starts_at)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "End date must be after start date.",
        path: ["ends_at"],
      });
    }
  });

export const updateCouponSchema = createCouponSchema.extend({
  id: z.string().uuid(),
});

export type CreateCouponType = z.infer<typeof createCouponSchema>;
export type UpdateCouponType = z.infer<typeof updateCouponSchema>;
