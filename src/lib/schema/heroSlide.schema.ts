import { z } from "zod";
import { HERO_BUTTON_POSITIONS } from "@/lib/types/heroSlide";

// The image itself is a File, handled outside zod by the upload action —
// this only validates the text fields a store owner fills in per slide.
export const heroSlideFieldsSchema = z.object({
  headline: z.string().trim().max(120).optional().nullable(),
  subtext: z.string().trim().max(240).optional().nullable(),
  button_text: z.string().trim().max(40).optional().nullable(),
  button_link: z.string().trim().max(500).optional().nullable(),
  button_position: z.enum(HERO_BUTTON_POSITIONS).optional().nullable(),
  button_new_tab: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type HeroSlideFieldsType = z.infer<typeof heroSlideFieldsSchema>;
