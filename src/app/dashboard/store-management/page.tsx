"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStore } from "@/lib/hook/stores/useStore";
import { useStoreSettings } from "@/lib/hook/stores/useStoreSettings";
import { useUpdateStore } from "@/lib/hook/stores/update/useUpdateStore";

import { StoreHeader } from "@/app/components/admin/dashboard/store-settings/storeCard/StoreHeader";
import { StoreInfoCard } from "@/app/components/admin/dashboard/store-settings/storeCard/StoreInfoCard";
import { StoreSettingsCard } from "@/app/components/admin/dashboard/store-settings/storeCard/StoreSettingsCard";
import { ShippingFeesCard } from "@/app/components/admin/dashboard/store-settings/storeCard/ShippingFeesCard";
import { PoliciesCard } from "@/app/components/admin/dashboard/store-settings/storeCard/PoliciesCard";
import { SheiSkeleton } from "@/app/components/ui/shei-skeleton";

import type {
  StoreData,
  StoreSettings,
  UpdatedStoreData,
  UpdatedStoreSettings,
} from "@/lib/types/store/store";

export default function StorePage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const safeStoreId = storeId ?? "";

  const { store: fetchedStore, loading: storeLoading } = useStore(safeStoreId);
  const { settings, loading: settingsLoading } = useStoreSettings(safeStoreId);
  const { update } = useUpdateStore(safeStoreId);

  const [store, setStore] = useState<StoreData | null>(null);
  const [localSettings, setLocalSettings] = useState<StoreSettings | null>(
    null
  );

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);
  useEffect(() => {
    if (fetchedStore) {
      setStore(fetchedStore);
    }
  }, [fetchedStore]);

  const handleUpdateStore = async (
    data: UpdatedStoreData,
    settingsPayload?: UpdatedStoreSettings
  ): Promise<StoreData> => {
    const updated = await update({
      data: {
        ...store, // keep other store fields
        ...data,
      },
      settingsPayload, // optional settings update
    });

    if (!updated.store) throw new Error("Failed to update store");

    // Update store in state
    setStore(updated.store);

    // settings are updated in backend, no need to store here
    return updated.store;
  };

  if (userLoading) return <SheiSkeleton />;

  if (!storeId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-medium">No Store Found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You don&apos;t have a store assigned to your account.
          </p>
        </div>
      </div>
    );
  }

  if (storeLoading || settingsLoading) {
    return (
      <div className="space-y-6">
        <SheiSkeleton />
        <div className="grid gap-6 md:grid-cols-2">
          <SheiSkeleton />
          <SheiSkeleton />
          <SheiSkeleton />
        </div>
        <SheiSkeleton />
        <SheiSkeleton />
      </div>
    );
  }

  if (!store) return <div>Store Not Found</div>;

  return (
    <div className="space-y-8 pb-8">
      <StoreHeader
        store={store}
        onUpdate={setStore}
        updateStore={handleUpdateStore}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <StoreInfoCard
          store={store}
          onUpdate={async (data) => {
            await handleUpdateStore(data); // ignore return value
          }}
        />
        {settings && (
          <StoreSettingsCard
            settings={settings}
            onUpdate={async (updatedSettings) => {
              // Call your unified function
              await handleUpdateStore({}, updatedSettings); // no store data, just settings
            }}
          />
        )}
      </div>

      {settings && (
        <>
          <ShippingFeesCard fees={settings.shipping_fees} settings={settings} />
          <PoliciesCard
            settings={localSettings!}
            onUpdatePolicy={async (type, content) => {
              // Prepare payload for updateStoreSettings
              const payload: UpdatedStoreSettings =
                type === "terms"
                  ? { terms_and_conditions: content }
                  : { privacy_policy: content };

              // Use your centralized update function
              await handleUpdateStore({}, payload);
              setLocalSettings((prev) =>
                prev ? { ...prev, ...payload } : prev
              );
            }}
          />
        </>
      )}
    </div>
  );
}
