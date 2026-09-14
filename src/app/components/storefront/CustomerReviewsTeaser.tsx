"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { getStoreReviews, type StoreReview } from "@/lib/queries/storeReviews/getStoreReviews";
import { getAvatarProps } from "@/lib/utils/avatarColor";
import { useTranslation } from "@/lib/hook/useTranslation";

interface CustomerReviewsTeaserProps {
  storeId: string;
  storeSlug: string;
}

/**
 * A handful of written testimonials on the homepage, distinct from
 * StoreReviewsSection (the full ratings breakdown + write-a-review flow on
 * the dedicated /reviews page) — this is a teaser only, no interaction.
 * Renders nothing if the store has no reviews with actual written text yet
 * (a rating-only review has nothing to quote).
 */
export function CustomerReviewsTeaser({ storeId, storeSlug }: CustomerReviewsTeaserProps) {
  const t = useTranslation();
  const [reviews, setReviews] = useState<StoreReview[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Over-fetch a bit since not every review has written text to quote.
    getStoreReviews(storeId, { page: 1, pageSize: 9 }).then((result) => {
      if (cancelled) return;
      setReviews(result.reviews.filter((r) => r.review_text?.trim()).slice(0, 3));
    });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="border-t border-stone-100 dark:border-gray-800/60 pt-10 sm:pt-16 pb-16 sm:pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            {t.storeReviews.title}
          </h2>
          <Link
            href={`/${storeSlug}/reviews`}
            className="shrink-0 text-xs sm:text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            {t.home.viewAll}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {reviews.map((review) => (
            <ReviewQuoteCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewQuoteCard({ review }: { review: StoreReview }) {
  const { initial, colorClass } = getAvatarProps(review.reviewer_name);
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      {review.rating !== null && (
        <div className="flex items-center gap-0.5 mb-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${i <= review.rating! ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-gray-700"}`}
            />
          ))}
        </div>
      )}
      <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4">
        &ldquo;{review.review_text}&rdquo;
      </p>
      <div className="flex items-center gap-2.5 mt-4">
        <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${colorClass}`}>
          {initial}
        </span>
        <p className="text-[13px] font-semibold text-foreground truncate">{review.reviewer_name}</p>
      </div>
    </div>
  );
}
