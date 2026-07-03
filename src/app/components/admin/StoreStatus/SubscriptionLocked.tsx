"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Clock } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { getStoreInvoices } from "@/lib/queries/subscription/getStoreSubscription";
import type { SubscriptionAccessState } from "@/lib/utils/subscriptionAccess";

interface SubscriptionLockedProps {
  storeId: string;
  state: SubscriptionAccessState;
  daysLeftInGrace?: number;
}

export default function SubscriptionLocked({ storeId, state, daysLeftInGrace }: SubscriptionLockedProps) {
  const t = useTranslation();
  const [awaitingReview, setAwaitingReview] = useState(false);

  useEffect(() => {
    getStoreInvoices(storeId).then((invoices) => {
      setAwaitingReview(invoices.some((inv) => inv.status === "submitted"));
    });
  }, [storeId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="max-w-md w-full bg-background rounded-2xl shadow-xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <Lock className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </div>

        <h1 className="text-xl font-semibold text-foreground">
          {t.admin.subLockedTitle}
        </h1>

        {awaitingReview ? (
          <div className="mt-4 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-3 text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2 text-left">
            <Clock className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{t.admin.subLockedAwaitingReview}</span>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {state === "grace" && daysLeftInGrace
              ? `${t.admin.subLockedGraceHint} ${daysLeftInGrace}`
              : t.admin.subLockedFullHint}
          </p>
        )}

        <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-border p-3 text-sm text-muted-foreground">
          {t.admin.subLockedDataSafe}
        </div>

        <div className="mt-6">
          <Link
            href="/dashboard/subscription"
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            {t.admin.subLockedCta}
          </Link>
        </div>
      </div>
    </div>
  );
}
