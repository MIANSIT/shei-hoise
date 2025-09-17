import { z } from "zod";

/**
 * Supabase categories table fields:
 * name, slug, description, parent_id, image, is_active, created_at, edited_at
 * 
 * In the UI we only collect name, slug, description.
 * The rest will be handled as null/defaults.
 */
export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(), // you said: use id as Parent_id if needed
  // image: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.extend({
  id: z.string().uuid(), // Required for updates
});

export type CreateCategoryType = z.infer<typeof createCategorySchema>;
export type UpdateCategoryType = z.infer<typeof updateCategorySchema>;
