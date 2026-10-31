import { z } from "zod";
export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional().nullable(),
  parent_id: z
    .string()
    .uuid()
    .or(z.literal("")) // allow empty string
    .transform((val) => (val === "" ? null : val))
    .nullable()
    .optional(),
  is_active: z.boolean().default(true),
  /** Shown as a browsable category on the storefront (shop filter, home page). Off = kept for the shop's own use. */
  show_in_store: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.extend({
  id: z.string().uuid(),
  // No default on an update: a caller that doesn't send it (like the Active
  // switch on the list) must leave the saved choice alone.
  show_in_store: z.boolean().optional(),
});

export type CreateCategoryType = z.infer<typeof createCategorySchema>;
export type UpdateCategoryType = z.infer<typeof updateCategorySchema>;
