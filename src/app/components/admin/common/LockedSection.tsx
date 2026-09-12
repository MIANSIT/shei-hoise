"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";

interface LockedSectionProps {
  message?: string;
}

/** Inline lock shown in place of a single section/widget on an otherwise-accessible page (e.g. dashboard analytics widgets) when the store's plan doesn't include the feature — unlike FeatureLocked, the rest of the page stays usable. */
export default function LockedSection({ message }: LockedSectionProps) {
  const t = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-10 px-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">{message ?? t.admin.featureLockedHint}</p>
      <Link
        href="/dashboard/subscription/plans"
        className="text-xs font-semibold text-primary hover:underline"
      >
        {t.admin.featureLockedCta}
      </Link>
    </div>
  );
}
