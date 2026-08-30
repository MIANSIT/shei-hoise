"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Input, Pagination, notification } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { Star, Eye, EyeOff } from "lucide-react";
import {
  getVendorReviews,
  VendorReviewItem,
} from "@/lib/queries/reviews/getVendorReviews";
import { toggleReviewApproval } from "@/lib/queries/reviews/toggleReviewApproval";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";

const PAGE_SIZE = 20;

function StarRow({ rating }: { rating: number | null }) {
  if (rating === null) {
    return <span className="text-xs text-muted-foreground">Comment only</span>;
  }
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );
}

const ProductReviewsTable: React.FC = () => {
  const { user } = useCurrentUser();
  const [notif, contextHolder] = notification.useNotification();

  const [reviews, setReviews] = useState<VendorReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!user?.store_id) return;
    setLoading(true);
    try {
      const res = await getVendorReviews({
        storeId: user.store_id,
        search,
        page,
        pageSize: PAGE_SIZE,
      });
      setReviews(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
      notif.error({ message: "Failed to load reviews" });
    } finally {
      setLoading(false);
    }
  }, [user?.store_id, search, page, notif]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleToggle = async (review: VendorReviewItem) => {
    setTogglingId(review.id);
    try {
      const result = await toggleReviewApproval(review.id, !review.is_approved);
      if (!result.success) {
        notif.error({ message: result.error });
        return;
      }
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, is_approved: !r.is_approved } : r)),
      );
    } catch (err) {
      console.error(err);
      notif.error({ message: "Failed to update review" });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {contextHolder}

      <Input
        placeholder="Search review text…"
        prefix={<SearchOutlined />}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
        size="large"
      />

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Review</th>
              <th className="px-4 py-3">Reviewer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && reviews.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No reviews yet.
                </td>
              </tr>
            )}
            {reviews.map((review) => (
              <tr key={review.id} className="border-b border-border last:border-0 align-top">
                <td className="px-4 py-3 font-medium text-foreground">
                  {review.product?.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <StarRow rating={review.rating} />
                </td>
                <td className="px-4 py-3 max-w-sm">
                  {review.review_title && (
                    <p className="font-medium text-foreground">{review.review_title}</p>
                  )}
                  {review.review_text && (
                    <p className="text-muted-foreground line-clamp-2">{review.review_text}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {review.reviewer_name}
                  {review.is_verified_purchase && (
                    <span className="ml-1.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      Verified
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(review.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      review.is_approved
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {review.is_approved ? "Visible" : "Hidden"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleToggle(review)}
                    disabled={togglingId === review.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    {review.is_approved ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Hide
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Show
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <div className="flex justify-end">
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={(p) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
};

export default ProductReviewsTable;
