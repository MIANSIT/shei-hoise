import { z } from "zod";

const categoryRating = z
  .number({ message: "Pick a rating" })
  .int()
  .min(1, "Pick a rating")
  .max(5, "Pick a rating")
  .optional();

export const storeReviewSchema = z.object({
  store_id: z.string().uuid(),
  // Set only when a verified delivered order backs the review — reviewing
  // doesn't require a purchase, but a matching order still earns the
  // "Verified Purchase" badge. Mirrors reviewSchema's order_id handling.
  order_id: z.string().uuid().optional().nullable(),
  // Four category ratings instead of product reviews' single `rating` —
  // all optional here since a verified purchase is required to rate at
  // all; createStoreReview additionally discards whatever the client sent
  // when the purchase doesn't actually verify, so this isn't just a UI
  // nicety. When present, all four are required together (checked in
  // superRefine) — a partial breakdown isn't a useful average.
  product_quality_rating: categoryRating,
  delivery_rating: categoryRating,
  service_rating: categoryRating,
  value_rating: categoryRating,
  review_title: z.string().max(255).optional(),
  review_text: z
    .string()
    .min(1, "Write a few words about your experience")
    .max(2000, "Keep it under 2000 characters"),
}).superRefine((data, ctx) => {
  const ratings = [
    data.product_quality_rating,
    data.delivery_rating,
    data.service_rating,
    data.value_rating,
  ];
  const anySet = ratings.some((r) => r !== undefined);
  const allSet = ratings.every((r) => r !== undefined);
  if (anySet && !allSet) {
    ctx.addIssue({
      code: "custom",
      message: "Rate all four categories, or none",
      path: ["product_quality_rating"],
    });
  }
});

export type StoreReviewFormType = z.infer<typeof storeReviewSchema>;
