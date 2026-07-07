"use client";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { PathaoConnectCard } from "@/app/components/admin/dashboard/store-settings/storeCard/PathaoConnectCard";
import { Truck } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";

export default function CourierPage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const t = useTranslation();

  if (userLoading) {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-red-400 to-orange-500 flex items-center justify-center shrink-0">
            <Truck size={18} color="white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white m-0 tracking-tight leading-tight">
              {t.admin.courierPageTitle}
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 m-0">
              {t.admin.courierPageSubtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-5 sm:py-7 space-y-5">
        <PathaoConnectCard storeId={storeId} />

        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t.admin.courierShipmentsComingTitle}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {t.admin.courierShipmentsComingHint}
          </p>
        </div>
      </div>
    </div>
  );
}
