"use client";

import { Spin } from "antd";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";
import { PromoBannersCard } from "@/app/components/admin/dashboard/storefrontDesign/PromoBannersCard";

export default function PromoBannersPage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const { loading: featureLoading, allowed } = useFeatureGate(storeId, "storefront_design");

  if (userLoading || featureLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spin size="large" />
      </div>
    );
  }

  if (!allowed) return <FeatureLocked />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Promo Banners</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the side-by-side promo split section on your homepage (e.g. &quot;New Arrivals&quot; / &quot;Best Sellers&quot;).
        </p>
      </div>

      <PromoBannersCard />
    </div>
  );
}
