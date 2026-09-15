import { z } from "zod";

export const announcementFieldsSchema = z.object({
  text: z.string().trim().min(1, "Announcement text is required").max(200),
  is_active: z.boolean().default(true),
});

export type AnnouncementFieldsType = z.infer<typeof announcementFieldsSchema>;
