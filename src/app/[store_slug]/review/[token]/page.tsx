"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/lib/hook/userCheckAuth";
import { linkReviewInviteOrder } from "@/lib/queries/reviews/linkReviewInviteOrder";
import { useTranslation } from "@/lib/hook/useTranslation";

export default function ReviewInvitePage() {
  const params = useParams();
  const router = useRouter();
  const store_slug = params.store_slug as string;
  const token = params.token as string;
  const t = useTranslation();

  const { session, loading: authLoading } = useSupabaseAuth();
  const [errorReason, setErrorReason] = useState<
    "not_found" | "expired" | "claimed_by_other" | null
  >(null);

  useEffect(() => {
    if (authLoading || !token || !store_slug) return;

    if (!session) {
      const redirectTo = `/${store_slug}/review/${token}`;
      router.replace(`/${store_slug}/signup?redirect=${encodeURIComponent(redirectTo)}`);
      return;
    }

    linkReviewInviteOrder(token).then((result) => {
      if (!result.success) {
        if (result.reason === "unauthorized") {
          // Session existed a moment ago but isn't valid server-side —
          // send them through signup/login again rather than dead-end.
          const redirectTo = `/${store_slug}/review/${token}`;
          router.replace(`/${store_slug}/signup?redirect=${encodeURIComponent(redirectTo)}`);
          return;
        }
        setErrorReason(result.reason);
        return;
      }
      router.replace(`/${store_slug}/product/${result.productSlug}`);
    });
  }, [authLoading, session, token, store_slug, router]);

  if (errorReason) {
    const message =
      errorReason === "claimed_by_other"
        ? t.reviews.inviteClaimedByOther
        : errorReason === "expired"
          ? t.reviews.inviteExpired
          : t.reviews.inviteInvalid;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <p className="text-gray-600 dark:text-gray-400">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
