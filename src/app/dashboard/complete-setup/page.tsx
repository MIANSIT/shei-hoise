"use client";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStore } from "@/lib/hook/stores/useStore";
import { useStoreSettings } from "@/lib/hook/stores/useStoreSettings";
import { useUpdateStore } from "@/lib/hook/stores/update/useUpdateStore";
import { dismissStoreSetupPrompt } from "@/lib/queries/stores/dismissStoreSetupPrompt";
import { clearStoreCache } from "@/lib/queries/stores/getStoreBySlugWithLogo";
import { emitStoreSetupCompleted, emitStoreSetupProgress } from "@/lib/utils/storeSetupEvent";
import CompleteSetupWizard from "@/app/components/admin/completeSetup/CompleteSetupWizard";
import { SheiSkeleton } from "@/app/components/ui/shei-skeleton";
import { useTranslation } from "@/lib/hook/useTranslation";
import type {
  UpdatedStoreData,
  UpdatedStoreSettings,
  UpdatedStoreSocialMedia,
} from "@/lib/types/store/store";

export default function CompleteSetupPage() {
  const { storeId, storeSlug, loading: userLoading } = useCurrentUser();
  const t = useTranslation();
  const safeStoreId = storeId ?? "";

  const { store, socialMedia, loading: storeLoading } = useStore(safeStoreId);
  const { settings, loading: settingsLoading } = useStoreSettings(safeStoreId);
  const { update } = useUpdateStore(safeStoreId);

  const handleSaveIdentity = async (data: {
    store_name: string;
    store_slug: string;
    logoFile?: File | null;
    bannerFile?: File | null;
    clearLogo?: boolean;
    clearBanner?: boolean;
  }): Promise<boolean> => {
    const result = await update({
      storeData: { store_name: data.store_name, store_slug: data.store_slug },
      logoFile: data.logoFile,
      bannerFile: data.bannerFile,
      clearLogo: data.clearLogo,
      clearBanner: data.clearBanner,
    });
    return !!result.store;
  };

  const handleSaveStore = async (data: UpdatedStoreData): Promise<boolean> => {
    const result = await update({ storeData: data });
    return !!result.store;
  };

  const handleSaveSettings = async (
    data: UpdatedStoreSettings,
  ): Promise<boolean> => {
    const result = await update({ settingsData: data });
    return !!result.settings;
  };

  const handleSaveSocialMedia = async (
    data: UpdatedStoreSocialMedia,
  ): Promise<boolean> => {
    const result = await update({ socialMediaData: data });
    return !!result.socialMedia;
  };

  const handleProgressChange = (steps: string[]) => {
    // Best-effort: the step's own data was already saved before this fires,
    // so a failure here only means progress display might not survive
    // navigating away — not data loss. Not worth blocking the UI on.
    void update({ storeData: { setup_progress: steps } });
    emitStoreSetupProgress(steps);
  };

  const handleFinish = async () => {
    if (!storeId) return;
    const result = await dismissStoreSetupPrompt(storeId);
    if (result.success && storeSlug) {
      clearStoreCache(storeSlug);
      emitStoreSetupCompleted();
    }
  };

  if (userLoading || storeLoading || settingsLoading) {
    return (
      <div className="space-y-5">
        <SheiSkeleton className="h-10 w-72" />
        <SheiSkeleton className="h-96" />
      </div>
    );
  }

  if (!store || !settings || !storeSlug) {
    return <div className="text-sm text-muted-foreground">{t.admin.storeNotFoundDB}</div>;
  }

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          {t.completeSetup.pageTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.completeSetup.pageSubtitle}
        </p>
      </div>

      <CompleteSetupWizard
        store={store}
        settings={settings}
        socialMedia={socialMedia}
        storeSlug={storeSlug}
        onSaveIdentity={handleSaveIdentity}
        onSaveStore={handleSaveStore}
        onSaveSettings={handleSaveSettings}
        onSaveSocialMedia={handleSaveSocialMedia}
        onProgressChange={handleProgressChange}
        onFinish={handleFinish}
      />
    </div>
  );
}
