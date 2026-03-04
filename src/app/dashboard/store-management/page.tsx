"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStore } from "@/lib/hook/stores/useStore";
import { useStoreSettings } from "@/lib/hook/stores/useStoreSettings";
import { useUpdateStore } from "@/lib/hook/stores/update/useUpdateStore";
import type { UpdatedStoreSocialMedia } from "@/lib/types/store/store";
import { StoreHeader } from "@/app/components/admin/dashboard/store-settings/storeCard/StoreHeader";
import { StoreInfoCard } from "@/app/components/admin/dashboard/store-settings/storeCard/StoreInfoCard";
import { StoreSettingsCard } from "@/app/components/admin/dashboard/store-settings/storeCard/StoreSettingsCard";
import { ShippingFeesCard } from "@/app/components/admin/dashboard/store-settings/storeCard/ShippingFeesCard";
import { PoliciesCard } from "@/app/components/admin/dashboard/store-settings/storeCard/PoliciesCard";
import { SheiSkeleton } from "@/app/components/ui/shei-skeleton";
import { StoreSocialMediaCard } from "@/app/components/admin/dashboard/store-settings/storeCard/StoreSocialMediaCard";
import { Store } from "lucide-react";

import type {
  StoreData,
  StoreSettings,
  UpdatedStoreData,
  UpdatedStoreSettings,
} from "@/lib/types/store/store";

export default function StorePage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const safeStoreId = storeId ?? "";

  const {
    store: fetchedStore,
    socialMedia,
    setSocialMedia,
    loading: storeLoading,
  } = useStore(safeStoreId);

  const { settings, loading: settingsLoading } = useStoreSettings(safeStoreId);
  const { update } = useUpdateStore(safeStoreId);

  const [store, setStore] = useState<StoreData | null>(null);
  const [localSettings, setLocalSettings] = useState<StoreSettings | null>(
    null,
  );

  useEffect(() => {
    if (fetchedStore) setStore(fetchedStore);
  }, [fetchedStore]);

  useEffect(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  const handleUpdateStore = async (
    storeData: UpdatedStoreData = {},
    settingsData?: UpdatedStoreSettings,
    logoFile?: File | null,
    bannerFile?: File | null,
    clearLogo?: boolean,
    clearBanner?: boolean,
  ): Promise<StoreData> => {
    const updated = await update({
      storeData,
      settingsData,
      logoFile,
      bannerFile,
      clearLogo,
      clearBanner,
    });

    // Only throw if a store update was attempted but failed
    const storeUpdateAttempted =
      Object.keys(storeData).length > 0 ||
      logoFile ||
      bannerFile ||
      clearLogo ||
      clearBanner;

    if (storeUpdateAttempted && !updated.store) {
      throw new Error("Failed to update store");
    }

    // Use updated store if returned, otherwise keep current store state
    const resultStore = updated.store ?? store!;
    setStore(resultStore);

    if (updated.settings) setLocalSettings(updated.settings);

    return resultStore;
  };

  const handleUpdateSocialMedia = async (
    socialMediaData: UpdatedStoreSocialMedia,
  ): Promise<void> => {
    if (!store) return;
    const updated = await update({ socialMediaData });
    if (updated.socialMedia) setSocialMedia(updated.socialMedia);
  };

  if (userLoading) return <SheiSkeleton />;

  if (!storeId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center">
          <Store className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="text-base font-semibold text-foreground">
            No Store Found
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            You don&apos;t have a store assigned to your account yet.
          </p>
        </div>
      </div>
    );
  }

  if (storeLoading || settingsLoading) {
    return (
      <div className="space-y-5">
        <SheiSkeleton className="h-52" />
        <div className="grid gap-5 lg:grid-cols-2">
          <SheiSkeleton className="h-72" />
          <SheiSkeleton className="h-72" />
        </div>
        <SheiSkeleton className="h-48" />
        <SheiSkeleton className="h-48" />
        <SheiSkeleton className="h-64" />
      </div>
    );
  }

  if (!store) return <div>Store Not Found</div>;

  return (
    <div className="space-y-5 pb-10 max-w-7xl mx-auto">
      <StoreHeader
        store={store}
        onUpdate={setStore}
        updateStore={({
          store_name,
          store_slug,
          logoFile,
          bannerFile,
          clearLogo,
          clearBanner,
        }) =>
          handleUpdateStore(
            { store_name, store_slug },
            undefined,
            logoFile,
            bannerFile,
            clearLogo,
            clearBanner,
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <StoreInfoCard
          store={store}
          onUpdate={async (data) => {
            await handleUpdateStore(data);
          }}
        />
        {settings && (
          <StoreSettingsCard
            settings={settings}
            onUpdate={async (updatedSettings) => {
              await handleUpdateStore({}, updatedSettings);
            }}
          />
        )}
      </div>

      <StoreSocialMediaCard
        socialMedia={socialMedia}
        onUpdate={handleUpdateSocialMedia}
      />

      {settings && (
        <ShippingFeesCard fees={settings.shipping_fees} settings={settings} />
      )}

      {settings && (
        <PoliciesCard
          settings={localSettings!}
          onUpdatePolicy={async (type, content) => {
            const payload: UpdatedStoreSettings =
              type === "terms"
                ? { terms_and_conditions: content }
                : { privacy_policy: content };
            await handleUpdateStore({}, payload);
            setLocalSettings((prev) => (prev ? { ...prev, ...payload } : prev));
          }}
          onRemovePolicy={async (type) => {
            const payload: UpdatedStoreSettings =
              type === "terms"
                ? { terms_and_conditions: null }
                : { privacy_policy: null };
            await handleUpdateStore({}, payload);
            setLocalSettings((prev) => (prev ? { ...prev, ...payload } : prev));
          }}
        />
      )}
    </div>
  );
}
