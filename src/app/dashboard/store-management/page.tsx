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
import { FacebookCatalogCard } from "@/app/components/admin/dashboard/store-settings/storeCard/FacebookCatalogCard";
import { ShippingFeesCard } from "@/app/components/admin/dashboard/store-settings/storeCard/ShippingFeesCard";
import { PoliciesCard } from "@/app/components/admin/dashboard/store-settings/storeCard/PoliciesCard";
import { SheiSkeleton } from "@/app/components/ui/shei-skeleton";
import { StoreSocialMediaCard } from "@/app/components/admin/dashboard/store-settings/storeCard/StoreSocialMediaCard";
import { Store, Info, Settings, Share2, Truck, Shield } from "lucide-react";

import type {
  StoreData,
  StoreSettings,
  UpdatedStoreData,
  UpdatedStoreSettings,
} from "@/lib/types/store/store";
import { useTranslation } from "@/lib/hook/useTranslation";

export default function StorePage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const t = useTranslation();
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
            {t.admin.storeNotFoundTitle}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {t.admin.storeNotAssigned}
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

  if (!store) return <div>{t.admin.storeNotFoundDB}</div>;

  const navItems = [
    { id: "store-info", label: t.admin.storeMgmtNavInfo, icon: <Info className="h-3.5 w-3.5" /> },
    { id: "store-settings", label: t.admin.storeMgmtNavSettings, icon: <Settings className="h-3.5 w-3.5" /> },
    { id: "social-media", label: t.admin.storeMgmtNavSocial, icon: <Share2 className="h-3.5 w-3.5" /> },
    { id: "shipping", label: t.admin.storeMgmtNavShipping, icon: <Truck className="h-3.5 w-3.5" /> },
    { id: "policies", label: t.admin.storeMgmtNavPolicies, icon: <Shield className="h-3.5 w-3.5" /> },
  ];

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

      {/* Sticky section navigation */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border border-border/60 rounded-xl shadow-sm">
        <nav className="flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-none">
          <span className="text-xs font-semibold text-muted-foreground shrink-0 pr-2 border-r border-border mr-1">
            {t.admin.storeMgmtNavHeader}
          </span>
          {navItems.map(({ id, label, icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all whitespace-nowrap shrink-0"
            >
              {icon}
              {label}
            </a>
          ))}
        </nav>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div id="store-info">
          <StoreInfoCard
            store={store}
            onUpdate={async (data) => {
              await handleUpdateStore(data);
            }}
          />
        </div>
        {settings && (
          <div id="store-settings" className="space-y-5">
            <StoreSettingsCard
              settings={settings}
              onUpdate={async (updatedSettings) => {
                await handleUpdateStore({}, updatedSettings);
              }}
            />
            <FacebookCatalogCard storeSlug={store.store_slug} />
          </div>
        )}
      </div>

      <div id="social-media">
        <StoreSocialMediaCard
          socialMedia={socialMedia}
          onUpdate={handleUpdateSocialMedia}
        />
      </div>

      {settings && (
        <div id="shipping">
          <ShippingFeesCard fees={settings.shipping_fees} settings={settings} />
        </div>
      )}

      {settings && (
        <div id="policies">
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
        </div>
      )}
    </div>
  );
}
