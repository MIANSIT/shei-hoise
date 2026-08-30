"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Package, Truck, Headset, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { storeReviewSchema, StoreReviewFormType } from "@/lib/schema/storeReviewSchema";
import { createStoreReview } from "@/lib/queries/storeReviews/createStoreReview";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useTranslation } from "@/lib/hook/useTranslation";
import { StarRating } from "@/app/components/products/reviews/StarRating";

interface StoreReviewFormProps {
  storeId: string;
  /** Set when a verified delivered order backs this review — unlocks the category ratings; null means comment-only. */
  orderId: string | null;
  onSubmitted: () => void;
  onCancel: () => void;
}

const CATEGORY_FIELDS = [
  { name: "product_quality_rating", labelKey: "categoryProductQuality", icon: Package },
  { name: "delivery_rating", labelKey: "categoryDelivery", icon: Truck },
  { name: "service_rating", labelKey: "categoryService", icon: Headset },
  { name: "value_rating", labelKey: "categoryValue", icon: Wallet },
] as const;

export function StoreReviewForm({ storeId, orderId, onSubmitted, onCancel }: StoreReviewFormProps) {
  const t = useTranslation();
  const notify = useSheiNotification();
  const [submitting, setSubmitting] = useState(false);
  const canRate = !!orderId;

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StoreReviewFormType>({
    resolver: zodResolver(storeReviewSchema),
    defaultValues: {
      store_id: storeId,
      order_id: orderId ?? undefined,
      product_quality_rating: canRate ? 5 : undefined,
      delivery_rating: canRate ? 5 : undefined,
      service_rating: canRate ? 5 : undefined,
      value_rating: canRate ? 5 : undefined,
      review_title: "",
      review_text: "",
    },
  });

  const onSubmit = async (values: StoreReviewFormType) => {
    setSubmitting(true);
    try {
      const result = await createStoreReview(values);
      if (!result.success) {
        notify.error(result.error);
        return;
      }
      notify.success(t.storeReviews.reviewSubmitted);
      onSubmitted();
    } catch (err) {
      console.error("Failed to submit store review:", err);
      notify.error(t.storeReviews.reviewFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* store_id/order_id have no visible field — register them explicitly
          so react-hook-form includes them in the submitted values instead of
          silently dropping unregistered defaultValues. */}
      <input type="hidden" {...register("store_id")} />
      {/* An absent order renders as "" (a hidden <input> can't hold null) —
          setValueAs runs before the zod resolver, so validation never sees
          the empty string fail the .uuid() format check. */}
      <input
        type="hidden"
        {...register("order_id", { setValueAs: (v) => (v === "" ? null : v) })}
      />

      {canRate ? (
        <div className="space-y-2">
          {CATEGORY_FIELDS.map(({ name, labelKey, icon: Icon }) => (
            <div
              key={name}
              className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 px-3.5 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <Label className="text-sm">{t.storeReviews[labelKey]}</Label>
              </div>
              <Controller
                control={control}
                name={name}
                render={({ field }) => (
                  <StarRating value={field.value ?? 0} onChange={field.onChange} size="md" />
                )}
              />
            </div>
          ))}
          {errors.product_quality_rating && (
            <p className="mt-1 text-xs text-rose-500">{errors.product_quality_rating.message}</p>
          )}
        </div>
      ) : (
        <>
          {/* No verified order — no category ratings. Still registered
              (hidden, always undefined) so react-hook-form doesn't silently
              drop the fields the way unregistered ones would. */}
          {CATEGORY_FIELDS.map(({ name }) => (
            <input
              key={name}
              type="hidden"
              {...register(name, { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
            />
          ))}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t.storeReviews.commentOnlyNotice}
          </p>
        </>
      )}

      <div>
        <Label htmlFor="store_review_title" className="mb-2 block">
          {t.storeReviews.reviewTitleLabel}
        </Label>
        <Input
          id="store_review_title"
          placeholder={t.storeReviews.reviewTitlePlaceholder}
          {...register("review_title")}
        />
      </div>

      <div>
        <Label htmlFor="store_review_text" className="mb-2 block">
          {t.storeReviews.reviewTextLabel}
        </Label>
        <Textarea
          id="store_review_text"
          rows={4}
          placeholder={t.storeReviews.reviewTextPlaceholder}
          {...register("review_text")}
        />
        {errors.review_text && (
          <p className="mt-1 text-xs text-rose-500">{errors.review_text.message}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" className="rounded-full" onClick={onCancel} disabled={submitting}>
          {t.storeReviews.cancel}
        </Button>
        <Button type="submit" className="rounded-full font-semibold" disabled={submitting}>
          {submitting ? t.storeReviews.submitting : t.storeReviews.submitReview}
        </Button>
      </div>
    </form>
  );
}
