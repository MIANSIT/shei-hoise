"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { dismissStoreSetupPrompt } from "@/lib/queries/stores/dismissStoreSetupPrompt";
import { clearStoreCache } from "@/lib/queries/stores/getStoreBySlugWithLogo";
import { emitStoreSetupCompleted } from "@/lib/utils/storeSetupEvent";
import { SETUP_STEP_IDS, getSetupStepTitle } from "@/lib/constants/setupSteps";

interface SetupChecklistBannerProps {
  storeId: string;
  storeSlug: string;
  setupProgress: string[];
}

export default function SetupChecklistBanner({
  storeId,
  storeSlug,
  setupProgress,
}: SetupChecklistBannerProps) {
  const t = useTranslation();
  const [dismissing, setDismissing] = useState(false);

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      const result = await dismissStoreSetupPrompt(storeId);
      if (result.success) {
        clearStoreCache(storeSlug);
        emitStoreSetupCompleted();
      }
    } finally {
      setDismissing(false);
    }
  };

  // Only the steps not yet saved — each one vanishes from the banner the
  // moment its data is actually persisted, instead of a static list that
  // stays the same regardless of real progress.
  const remainingSteps = SETUP_STEP_IDS.filter((id) => !setupProgress.includes(id));

  return (
    <div className="flex flex-wrap items-center gap-2 bg-chart-2/10 dark:bg-chart-2/10 border-b border-chart-2/20 px-4 py-2 text-xs sm:text-sm text-foreground">
      <Sparkles className="h-4 w-4 shrink-0 text-chart-2" />
      <span className="font-medium">{t.admin.setupPromptTitle}</span>
      <span className="text-muted-foreground hidden sm:inline">
        {t.admin.setupPromptHint
          .replace("{done}", String(setupProgress.length))
          .replace("{total}", String(SETUP_STEP_IDS.length))}
      </span>

      <div className="flex flex-wrap items-center gap-1.5 ml-auto">
        {remainingSteps.map((id) => (
          <Link
            key={id}
            href="/dashboard/complete-setup"
            className="rounded-full border border-chart-2/30 px-3 py-1 text-xs font-medium text-chart-2 hover:bg-chart-2/10 transition-colors whitespace-nowrap"
          >
            {getSetupStepTitle(t, id)}
          </Link>
        ))}

        <button
          type="button"
          onClick={handleDismiss}
          disabled={dismissing}
          aria-label={t.admin.setupPromptDismiss}
          className="p-1.5 rounded-full hover:bg-chart-2/10 transition-colors disabled:opacity-50 shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
