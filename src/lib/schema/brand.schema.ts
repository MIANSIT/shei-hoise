import { z } from "zod";

export const brandSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required").max(80, "Brand name is too long"),
  is_active: z.boolean().default(true),
});

export const updateBrandSchema = brandSchema.extend({
  id: z.string().uuid(),
});

export type BrandInput = z.infer<typeof brandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
