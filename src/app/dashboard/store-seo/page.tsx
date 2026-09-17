"use client";

import { Spin } from "antd";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStore } from "@/lib/hook/stores/useStore";
import { useUpdateStore } from "@/lib/hook/stores/update/useUpdateStore";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";
import { StoreSeoCard } from "@/app/components/admin/dashboard/store-settings/storeCard/StoreSeoCard";
import type { UpdatedStoreData, StoreData } from "@/lib/types/store/store";
import { useEffect, useState } from "react";

export default function StoreSeoPage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const safeStoreId = storeId ?? "";
  const { store: fetchedStore, loading: storeLoading } = useStore(safeStoreId);
  const { update } = useUpdateStore(safeStoreId);
  const { loading: featureLoading, allowed: seoAllowed } = useFeatureGate(storeId, "seo_tools");

  const [store, setStore] = useState<StoreData | null>(null);

  useEffect(() => {
    if (fetchedStore) setStore(fetchedStore);
  }, [fetchedStore]);

  const handleUpdate = async (data: UpdatedStoreData): Promise<void> => {
    const updated = await update({ storeData: data });
    if (updated.store) setStore(updated.store);
  };

  if (userLoading || storeLoading || featureLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spin size="large" />
      </div>
    );
  }

  if (!seoAllowed) return <FeatureLocked />;

  if (!store) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Store SEO</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Controls how your store appears in Google search results — separate from the description shown to customers on your storefront.
        </p>
      </div>

      <StoreSeoCard store={store} onUpdate={handleUpdate} />
    </div>
  );
}
