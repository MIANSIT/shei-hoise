"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquareText, PenLine, ShieldCheck, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getProductReviews, ProductReview } from "@/lib/queries/reviews/getProductReviews";
import { getReviewEligibility, ReviewEligibility } from "@/lib/queries/reviews/getReviewEligibility";
import { useTranslation } from "@/lib/hook/useTranslation";
import { getAvatarProps } from "@/lib/utils/avatarColor";
import { StarRating } from "./StarRating";
import { ReviewForm } from "./ReviewForm";

const PAGE_SIZE = 10;

interface ReviewsSectionProps {
  productId: string;
  storeSlug: string;
  average: number;
  total: number;
  onReviewSubmitted?: () => void;
}

function RatingBar({ count, total, stars }: { count: number; total: number; stars: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400">
      <span className="w-7 shrink-0 font-medium">{stars}★</span>
      <div className="h-2 flex-1 rounded-full bg-gray-200/70 dark:bg-gray-700/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-linear-to-r from-amber-400 to-amber-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-right tabular-nums">{count}</span>
    </div>
  );
}

function ReviewCard({ review }: { review: ProductReview }) {
  const { initial, colorClass } = getAvatarProps(review.reviewer_name);
  return (
    <div className="group rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 bg-white dark:bg-gray-900/60 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200">
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${colorClass}`}
          >
            {initial}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {review.reviewer_name}
            </p>
            {review.rating !== null && <StarRating value={review.rating} size="sm" />}
          </div>
        </div>
        <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0 pt-0.5">
          {new Date(review.created_at).toLocaleDateString()}
        </span>
      </div>
      {review.is_verified_purchase && (
        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-3 h-3" /> Verified Purchase
        </div>
      )}
      {review.review_title && (
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {review.review_title}
        </p>
      )}
      {review.review_text && (
        <p className="text-[13.5px] text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-6">
          {review.review_text}
        </p>
      )}
    </div>
  );
}

export function ReviewsSection({
  productId,
  storeSlug,
  average,
  total,
  onReviewSubmitted,
}: ReviewsSectionProps) {
  const t = useTranslation();

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  // All reviews' ratings count toward this, hidden text or not — mirrors
  // getProductRatingSummary, which the `total` prop was seeded from.
  const [ratingTotal, setRatingTotal] = useState(total);
  // Approved reviews only — what's actually paginated as cards below.
  const [visibleTotal, setVisibleTotal] = useState(0);
  const [ratingCounts, setRatingCounts] = useState<Record<1 | 2 | 3 | 4 | 5, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const loadReviews = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      try {
        const result = await getProductReviews(productId, { page: nextPage, pageSize: PAGE_SIZE });
        setReviews((prev) => (nextPage === 1 ? result.reviews : [...prev, ...result.reviews]));
        setVisibleTotal(result.total);
        setRatingTotal(result.ratingTotal);
        setRatingCounts(result.ratingCounts);
        setPage(nextPage);
      } finally {
        setLoading(false);
      }
    },
    [productId],
  );

  useEffect(() => {
    loadReviews(1);
    getReviewEligibility(productId).then(setEligibility);
  }, [productId, loadReviews]);

  const handleSubmitted = () => {
    setFormOpen(false);
    loadReviews(1);
    getReviewEligibility(productId).then(setEligibility);
    onReviewSubmitted?.();
  };

  return (
    <div className="mt-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_6px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_12px_rgba(0,0,0,0.4)] p-6 md:p-8">
      <div className="flex items-center gap-2.5 mb-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <MessageSquareText className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t.reviews.title}</h2>
      </div>

      <div className="rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 p-5 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 sm:gap-10">
          <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1.5">
            <span className="text-4xl font-black text-gray-900 dark:text-gray-50 tracking-tight">
              {average.toFixed(1)}
            </span>
            <div>
              <StarRating value={average} size="sm" />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {t.reviews.basedOn} {ratingTotal} {t.reviews.reviewsWord}
              </p>
            </div>
          </div>

          {ratingTotal > 0 && (
            <div className="flex flex-col gap-2 max-w-xs w-full">
              {([5, 4, 3, 2, 1] as const).map((stars) => (
                <RatingBar key={stars} stars={stars} count={ratingCounts[stars]} total={ratingTotal} />
              ))}
            </div>
          )}
        </div>
      </div>

      {eligibility?.canReview && (
        <Button
          onClick={() => setFormOpen(true)}
          className="mb-6 rounded-full gap-2 font-semibold shadow-sm"
        >
          <PenLine className="h-3.5 w-3.5" />
          {t.reviews.writeReview}
        </Button>
      )}
      {eligibility && !eligibility.canReview && eligibility.reason === "not_logged_in" && (
        <a
          href={`/${storeSlug}/login`}
          className="mb-6 inline-block text-sm font-semibold text-emerald-600 hover:underline"
        >
          {t.reviews.loginToReview}
        </a>
      )}
      {eligibility && !eligibility.canReview && eligibility.reason === "already_reviewed" && (
        <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">{t.reviews.alreadyReviewed}</p>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.reviews.writeReview}</DialogTitle>
            <DialogDescription>{t.reviews.writeReviewDescription}</DialogDescription>
          </DialogHeader>
          {eligibility?.canReview && (
            <ReviewForm
              productId={productId}
              orderId={eligibility.orderId}
              onSubmitted={handleSubmitted}
              onCancel={() => setFormOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {reviews.length === 0 && !loading ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600">
            <Sparkles className="h-5 w-5" />
          </span>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {eligibility?.canReview ? t.reviews.noReviewsYet : t.reviews.noReviewsYetNeutral}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {reviews.length < visibleTotal && (
        <div className="pt-5 text-center">
          <Button
            variant="outline"
            onClick={() => loadReviews(page + 1)}
            disabled={loading}
            className="rounded-full"
          >
            {t.reviews.loadMoreReviews}
          </Button>
        </div>
      )}
    </div>
  );
}
