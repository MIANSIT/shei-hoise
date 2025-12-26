"use client";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStore } from "@/lib/hook/stores/useStore";
import { useStoreSettings } from "@/lib/hook/stores/useStoreSettings";

import { StoreHeader } from "@/app/components/admin/dashboard/store-settings/storeCard/StoreHeader";
import { StoreInfoCard } from "@/app/components/admin/dashboard/store-settings/storeCard/StoreInfoCard";
import { StoreSettingsCard } from "@/app/components/admin/dashboard/store-settings/storeCard/StoreSettingsCard";
import { ShippingFeesCard } from "@/app/components/admin/dashboard/store-settings/storeCard/ShippingFeesCard";
import { PoliciesCard } from "@/app/components/admin/dashboard/store-settings/storeCard/PoliciesCard";
import { SheiSkeleton } from "@/app/components/ui/shei-skeleton";

export default function StorePage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const { store, loading: storeLoading } = useStore(storeId);
  const { settings, loading: settingsLoading } = useStoreSettings(storeId);

  /* =======================
     LOADING STATES
  ======================= */
  if (userLoading) {
    return <SheiSkeleton />;
  }

  if (!storeId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
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

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.698-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-medium">Store Not Found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            The requested store could not be found in our system.
          </p>
        </div>
      </div>
    );
  }

  /* =======================
     UI
  ======================= */
  return (
    <div className="space-y-8 pb-8">
      <StoreHeader store={store} />

      <div className="grid gap-8 lg:grid-cols-2">
        <StoreInfoCard store={store} />
        {settings && <StoreSettingsCard settings={settings} />}
      </div>

      {settings && (
        <>
          <ShippingFeesCard fees={settings.shipping_fees} settings={settings} />
          <PoliciesCard settings={settings} />
        </>
      )}
    </div>
  );
}
