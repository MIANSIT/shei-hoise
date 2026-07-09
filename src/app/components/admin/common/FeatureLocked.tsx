"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";

interface FeatureLockedProps {
  title?: string;
}

/** Full-page lock shown when the store's plan doesn't include a given feature (e.g. expense tracking). */
export default function FeatureLocked({ title }: FeatureLockedProps) {
  const t = useTranslation();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-background rounded-2xl shadow-xl p-8 text-center border border-border">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <Lock className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </div>

        <h1 className="text-xl font-semibold text-foreground">
          {title ?? t.admin.featureLockedTitle}
        </h1>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          {t.admin.featureLockedHint}
        </p>

        <div className="mt-6">
          <Link
            href="/dashboard/subscription/plans"
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            {t.admin.featureLockedCta}
          </Link>
        </div>
      </div>
    </div>
  );
}
