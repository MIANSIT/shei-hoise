"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reviewSchema, ReviewFormType } from "@/lib/schema/reviewSchema";
import { createReview } from "@/lib/queries/reviews/createReview";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useTranslation } from "@/lib/hook/useTranslation";
import { StarRating } from "./StarRating";

interface ReviewFormProps {
  productId: string;
  /** Set when a verified delivered order backs this review; null submits unverified. */
  orderId: string | null;
  onSubmitted: () => void;
  onCancel: () => void;
}

export function ReviewForm({ productId, orderId, onSubmitted, onCancel }: ReviewFormProps) {
  const t = useTranslation();
  const notify = useSheiNotification();
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewFormType>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      product_id: productId,
      order_id: orderId ?? undefined,
      rating: 5,
      review_title: "",
      review_text: "",
    },
  });

  const onSubmit = async (values: ReviewFormType) => {
    setSubmitting(true);
    try {
      const result = await createReview(values);
      if (!result.success) {
        notify.error(result.error);
        return;
      }
      notify.success(t.reviews.reviewSubmitted);
      onSubmitted();
    } catch (err) {
      console.error("Failed to submit review:", err);
      notify.error(t.reviews.reviewFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* product_id/order_id have no visible field — register them explicitly
          so react-hook-form includes them in the submitted values instead of
          silently dropping unregistered defaultValues. */}
      <input type="hidden" {...register("product_id")} />
      {/* An absent order renders as "" (a hidden <input> can't hold null) —
          setValueAs runs before the zod resolver, so validation never sees
          the empty string fail the .uuid() format check. */}
      <input
        type="hidden"
        {...register("order_id", { setValueAs: (v) => (v === "" ? null : v) })}
      />

      <div>
        <Label className="mb-2 block">{t.reviews.rating}</Label>
        <Controller
          control={control}
          name="rating"
          render={({ field }) => (
            <StarRating value={field.value} onChange={field.onChange} size="lg" />
          )}
        />
        {errors.rating && (
          <p className="mt-1 text-xs text-rose-500">{errors.rating.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="review_title" className="mb-2 block">
          {t.reviews.reviewTitleLabel}
        </Label>
        <Input
          id="review_title"
          placeholder={t.reviews.reviewTitlePlaceholder}
          {...register("review_title")}
        />
      </div>

      <div>
        <Label htmlFor="review_text" className="mb-2 block">
          {t.reviews.reviewTextLabel}
        </Label>
        <Textarea
          id="review_text"
          rows={4}
          placeholder={t.reviews.reviewTextPlaceholder}
          {...register("review_text")}
        />
        {errors.review_text && (
          <p className="mt-1 text-xs text-rose-500">{errors.review_text.message}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          {t.reviews.cancel}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? t.reviews.submitting : t.reviews.submitReview}
        </Button>
      </div>
    </form>
  );
}
