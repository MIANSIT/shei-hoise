import { z } from "zod";

export const bundleItemSchema = z.object({
  component_product_id: z.string().uuid("Select a product"),
  component_variant_id: z.string().uuid().nullable().optional(),
  quantity_needed: z
    .number({ message: "Quantity is required" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
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
});

export type BundleItemType = z.infer<typeof bundleItemSchema>;
export type BundleType = z.infer<typeof bundleSchema>;
export type CreateBundleType = Omit<BundleType, "id">;
