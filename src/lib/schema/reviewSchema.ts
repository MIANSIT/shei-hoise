import { z } from "zod";

export const reviewSchema = z.object({
  product_id: z.string().uuid(),
  // Set only when a verified delivered order backs the review — reviewing
  // doesn't require a purchase, but a matching order still earns the
  // "Verified Purchase" badge. ReviewForm's hidden <input> for this field
  // normalizes "" to null via setValueAs (a hidden input can't hold null
  // itself), since "" would otherwise fail the .uuid() format check even
  // though .optional()/.nullable() allow undefined/null.
  order_id: z.string().uuid().optional().nullable(),
  rating: z
    .number({ message: "Pick a rating" })
    .int()
    .min(1, "Pick a rating")
    .max(5, "Pick a rating"),
  review_title: z.string().max(255).optional(),
  review_text: z
    .string()
    .min(1, "Write a few words about the product")
    .max(2000, "Keep it under 2000 characters"),
});

export type ReviewFormType = z.infer<typeof reviewSchema>;
