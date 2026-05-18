"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";
import PixelAnalyticsDashboard from "@/app/components/admin/dashboard/pixelAnalytics/PixelAnalyticsDashboard";

export default function PixelAnalyticsPage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const [pixelId, setPixelId] = useState<string | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    getStoreSettings(storeId).then((s) => {
      setPixelId(s?.facebook_pixel_id ?? null);
      setSettingsLoaded(true);
    });
  }, [storeId]);

  if (userLoading || !settingsLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!storeId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Store not found.</p>
      </div>
    );
  }

  return <PixelAnalyticsDashboard storeId={storeId} pixelId={pixelId} />;
}
