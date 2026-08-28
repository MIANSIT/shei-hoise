import { z } from "zod";

// Guards the computed money totals for a vendor order before it ever
// reaches createVendorOrder/updateVendorOrder — the DB CHECK constraints
// (supabase/migrations/20260823000003_add_vendor_money_check_constraints.sql)
// are the real floor, this is just a friendlier client-side rejection so a
// bad discount/paid amount doesn't have to round-trip to the server first.
export const vendorOrderTotalsSchema = z
  .object({
    subtotal: z.number().min(0),
    deliveryCost: z.number().min(0),
    discountAmount: z.number().min(0),
    paidAmount: z.number().min(0),
    grandTotal: z.number(),
  })
  .superRefine((data, ctx) => {
    if (data.discountAmount > data.subtotal + data.deliveryCost) {
      ctx.addIssue({
        code: "custom",
        message: "Discount cannot exceed the subtotal plus delivery cost",
        path: ["discountAmount"],
      });
    }
    if (data.grandTotal < 0) {
      ctx.addIssue({
        code: "custom",
        message: "Grand total cannot be negative",
        path: ["grandTotal"],
      });
    }
  });

export type VendorOrderTotals = z.infer<typeof vendorOrderTotalsSchema>;
