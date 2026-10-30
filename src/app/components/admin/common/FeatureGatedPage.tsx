"use client";

import { notFound } from "next/navigation";
import { Spin } from "antd";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";

interface FeatureGatedPageProps {
  /** Plan feature flag the page needs (see src/lib/utils/planFeatures.ts). */
  featureKey: string;
  children: React.ReactNode;
}

/** Shows the page only when the store's plan has the feature; otherwise it doesn't exist for that store (not-found page, no upsell). */
export default function FeatureGatedPage({ featureKey, children }: FeatureGatedPageProps) {
  const { storeId, loading: userLoading } = useCurrentUser();
  const { loading: featureLoading, allowed } = useFeatureGate(storeId, featureKey);

  if (userLoading || featureLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!allowed) notFound();

  return <>{children}</>;
}
