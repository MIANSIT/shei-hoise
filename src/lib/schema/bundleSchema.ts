import { z } from "zod";

export const bundleItemSchema = z.object({
  component_product_id: z.string().uuid("Select a product"),
  component_variant_id: z.string().uuid().nullable().optional(),
  quantity_needed: z
    .number({ message: "Quantity is required" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  // Rows sharing the same option_group_id are alternatives for one slot —
  // the customer picks exactly one. Null means fixed/required, as before.
  option_group_id: z.string().nullable().optional(),
  option_group_label: z.string().nullable().optional(),
});

export const bundleSchema = z.object({
  id: z.string().uuid().optional(),
  store_id: z.string().uuid(),
  category_id: z
    .string()
    .nullable()
    .refine((val) => val !== null && val !== "", {
      message: "Category is required",
    }),
  name: z.string().min(1, "Bundle name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().min(1, "Description is required"),
  short_description: z.string().optional(),

  base_price: z.number().positive("Price is required"),
  discounted_price: z.number().optional().nullable(),
  discount_amount: z.number().optional().nullable(),
  sku: z.string().min(1, "SKU is required"),

  status: z.enum(["draft", "active", "inactive", "archived"]),
  featured: z.boolean(),

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

  bundle_items: z
    .array(bundleItemSchema)
    .min(1, "Add at least one product to the bundle"),
}).superRefine((bundle, ctx) => {
  const groups = new Map<string, typeof bundle.bundle_items>();
  bundle.bundle_items.forEach((item) => {
    if (!item.option_group_id) return;
    const group = groups.get(item.option_group_id) ?? [];
    group.push(item);
    groups.set(item.option_group_id, group);
  });

  groups.forEach((group) => {
    if (group.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bundle_items"],
        message: "A choice group needs at least 2 alternatives",
      });
      return;
    }
    const [first, ...rest] = group;
    if (rest.some((item) => item.quantity_needed !== first.quantity_needed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bundle_items"],
        message: "All alternatives in a choice group must share the same quantity",
      });
    }
    if (rest.some((item) => (item.option_group_label || "") !== (first.option_group_label || ""))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bundle_items"],
        message: "All alternatives in a choice group must share the same label",
      });
    }
  });
});

export type BundleItemType = z.infer<typeof bundleItemSchema>;
export type BundleType = z.infer<typeof bundleSchema>;
export type CreateBundleType = Omit<BundleType, "id">;
