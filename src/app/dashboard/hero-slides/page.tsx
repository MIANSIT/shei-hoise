"use client";

import { Spin } from "antd";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";
import { HeroSlidesCard } from "@/app/components/admin/dashboard/storefrontDesign/HeroSlidesCard";

export default function HeroSlidesPage() {
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
        <h1 className="text-2xl font-bold text-foreground">Hero Slider</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the image carousel shown at the top of your homepage.
        </p>
      </div>

      <HeroSlidesCard />
    </div>
  );
}
