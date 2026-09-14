import { z } from "zod";

// The image itself is a File, handled outside zod by the upload action —
// this only validates the text fields a store owner fills in per banner.
export const promoBannerFieldsSchema = z.object({
  headline: z.string().trim().max(120).optional().nullable(),
  subtext: z.string().trim().max(240).optional().nullable(),
  button_text: z.string().trim().max(40).optional().nullable(),
  button_link: z.string().trim().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
});

export type PromoBannerFieldsType = z.infer<typeof promoBannerFieldsSchema>;
