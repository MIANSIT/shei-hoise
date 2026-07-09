"use client";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { SteadfastConnectCard } from "@/app/components/admin/dashboard/store-settings/storeCard/SteadfastConnectCard";
import { CourierShipmentsList } from "@/app/components/admin/dashboard/store-settings/storeCard/CourierShipmentsList";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";
import ComingSoon from "@/app/components/admin/common/ComingSoon";
import { STEADFAST_LIVE } from "@/lib/config/courierAvailability";
import { Truck } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";

export default function SteadfastCourierPage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const { loading: featureLoading, allowed } = useFeatureGate(storeId, "courier_tracking");
  const t = useTranslation();

  if (userLoading || featureLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!storeId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground">{t.admin.storeNotAssigned}</p>
      </div>
    );
  }

  if (!allowed) {
    return <FeatureLocked title={t.admin.steadfastCardTitle} />;
  }

  if (!STEADFAST_LIVE) {
    return (
      <ComingSoon
        title={t.admin.steadfastComingSoonTitle}
        hint={t.admin.steadfastComingSoonHint}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
            <Truck size={18} color="white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white m-0 tracking-tight leading-tight">
              {t.admin.steadfastCardTitle}
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 m-0">
              {t.admin.courierPageSubtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-5 sm:py-7 space-y-5">
        <SteadfastConnectCard storeId={storeId} />

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              {t.admin.pathaoShipmentsTitle}
            </h2>
          </div>
          <CourierShipmentsList storeId={storeId} courier="steadfast" />
        </div>
      </div>
    </div>
  );
}
