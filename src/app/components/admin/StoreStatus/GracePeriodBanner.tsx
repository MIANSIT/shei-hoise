"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";

interface GracePeriodBannerProps {
  daysLeftInGrace?: number;
}

export default function GracePeriodBanner({ daysLeftInGrace }: GracePeriodBannerProps) {
  const t = useTranslation();

  return (
    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 px-4 py-2 text-xs sm:text-sm text-amber-800 dark:text-amber-300">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        {t.admin.subLockedGraceHint} <strong className="tabular-nums">{daysLeftInGrace}</strong>
      </span>
      <Link
        href="/dashboard/subscription"
        className="font-semibold underline shrink-0 hover:opacity-80 transition-opacity"
      >
        {t.admin.subLockedCta}
      </Link>
    </div>
  );
}
