import { z } from "zod";
export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(), 
  // image: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.extend({
  id: z.string().uuid(),
});

export type CreateCategoryType = z.infer<typeof createCategorySchema>;
export type UpdateCategoryType = z.infer<typeof updateCategorySchema>;
