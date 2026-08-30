"use client";

import { useCallback, useEffect, useState } from "react";
import { Package, PenLine, ShieldCheck, Sparkles, Star, Truck, Wallet, Headset } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getStoreReviews, StoreReview } from "@/lib/queries/storeReviews/getStoreReviews";
import {
  getStoreReviewEligibility,
  StoreReviewEligibility,
} from "@/lib/queries/storeReviews/getStoreReviewEligibility";
import { useTranslation } from "@/lib/hook/useTranslation";
import { getAvatarProps } from "@/lib/utils/avatarColor";
import { StarRating } from "@/app/components/products/reviews/StarRating";
import { StoreReviewForm } from "./StoreReviewForm";

const PAGE_SIZE = 10;

interface StoreReviewsSectionProps {
  storeId: string;
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

const CATEGORY_ICONS = {
  product_quality: Package,
  delivery: Truck,
  service: Headset,
  value: Wallet,
} as const;

function CategoryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 px-3.5 py-3">
      <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 truncate">
          {label}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {value > 0 ? value.toFixed(1) : "—"}
          </span>
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
        </div>
      </div>
    </div>
  );
}

function StoreReviewCard({ review }: { review: StoreReview }) {
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

export function StoreReviewsSection({
  storeId,
  storeSlug,
  average,
  total,
  onReviewSubmitted,
}: StoreReviewsSectionProps) {
  const t = useTranslation();

  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [ratingTotal, setRatingTotal] = useState(total);
  const [visibleTotal, setVisibleTotal] = useState(0);
  const [ratingCounts, setRatingCounts] = useState<Record<1 | 2 | 3 | 4 | 5, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  });
  const [categoryAverages, setCategoryAverages] = useState({
    product_quality: 0,
    delivery: 0,
    service: 0,
    value: 0,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState<StoreReviewEligibility | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const loadReviews = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      try {
        const result = await getStoreReviews(storeId, { page: nextPage, pageSize: PAGE_SIZE });
        setReviews((prev) => (nextPage === 1 ? result.reviews : [...prev, ...result.reviews]));
        setVisibleTotal(result.total);
        setRatingTotal(result.ratingTotal);
        setRatingCounts(result.ratingCounts);
        setCategoryAverages(result.categoryAverages);
        setPage(nextPage);
      } finally {
        setLoading(false);
      }
    },
    [storeId],
  );

  useEffect(() => {
    loadReviews(1);
    getStoreReviewEligibility(storeId).then(setEligibility);
  }, [storeId, loadReviews]);

  const handleSubmitted = () => {
    setFormOpen(false);
    loadReviews(1);
    getStoreReviewEligibility(storeId).then(setEligibility);
    onReviewSubmitted?.();
  };

  return (
    <div className="mt-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_6px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_12px_rgba(0,0,0,0.4)] p-6 md:p-8">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t.storeReviews.title}</h2>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-5 ml-10.5">
        {t.storeReviews.subtitle}
      </p>

      <div className="rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 p-5 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 sm:gap-10">
          <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1.5">
            <span className="text-4xl font-black text-gray-900 dark:text-gray-50 tracking-tight">
              {average.toFixed(1)}
            </span>
            <div>
              <StarRating value={average} size="sm" />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {t.storeReviews.basedOn} {ratingTotal} {t.storeReviews.reviewsWord}
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

        {ratingTotal > 0 && (
          <div className="grid grid-cols-2 gap-2.5 mt-5 pt-5 border-t border-gray-200/70 dark:border-gray-700/50">
            <CategoryStat
              icon={CATEGORY_ICONS.product_quality}
              label={t.storeReviews.categoryProductQuality}
              value={categoryAverages.product_quality}
            />
            <CategoryStat
              icon={CATEGORY_ICONS.delivery}
              label={t.storeReviews.categoryDelivery}
              value={categoryAverages.delivery}
            />
            <CategoryStat
              icon={CATEGORY_ICONS.service}
              label={t.storeReviews.categoryService}
              value={categoryAverages.service}
            />
            <CategoryStat
              icon={CATEGORY_ICONS.value}
              label={t.storeReviews.categoryValue}
              value={categoryAverages.value}
            />
          </div>
        )}
      </div>

      {eligibility?.canReview && (
        <Button
          onClick={() => setFormOpen(true)}
          className="mb-6 rounded-full gap-2 font-semibold shadow-sm"
        >
          <PenLine className="h-3.5 w-3.5" />
          {t.storeReviews.writeReview}
        </Button>
      )}
      {eligibility && !eligibility.canReview && eligibility.reason === "not_logged_in" && (
        <a
          href={`/${storeSlug}/login`}
          className="mb-6 inline-block text-sm font-semibold text-violet-600 hover:underline"
        >
          {t.storeReviews.loginToReview}
        </a>
      )}
      {eligibility && !eligibility.canReview && eligibility.reason === "already_reviewed" && (
        <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">
          {t.storeReviews.alreadyReviewed}
        </p>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.storeReviews.writeReview}</DialogTitle>
            <DialogDescription>{t.storeReviews.writeReviewDescription}</DialogDescription>
          </DialogHeader>
          {eligibility?.canReview && (
            <StoreReviewForm
              storeId={storeId}
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
            {eligibility?.canReview ? t.storeReviews.noReviewsYet : t.storeReviews.noReviewsYetNeutral}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          {reviews.map((review) => (
            <StoreReviewCard key={review.id} review={review} />
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
            {t.storeReviews.loadMoreReviews}
          </Button>
        </div>
      )}
    </div>
  );
}
