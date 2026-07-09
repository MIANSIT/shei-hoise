"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { useTranslation } from "@/lib/hook/useTranslation";
import { Truck, Info, PackageSearch } from "lucide-react";
import { getDeliveryCouriers } from "@/lib/queries/deliveryCouriers/getDeliveryCouriers";
import {
  getManualCourierOrders,
  type ManualCourierOrderSummary,
} from "@/lib/queries/deliveryCouriers/getManualCourierOrders";
import type { DeliveryCourier } from "@/lib/types/store/store";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";

export default function ManualCourierPage() {
  const { courierId } = useParams<{ courierId: string }>();
  const { storeId, loading: userLoading } = useCurrentUser();
  const { loading: featureLoading, allowed } = useFeatureGate(storeId, "courier_tracking");
  const t = useTranslation();

  const [courier, setCourier] = useState<DeliveryCourier | null | undefined>(undefined);
  const [orders, setOrders] = useState<ManualCourierOrderSummary[] | null>(null);

  useEffect(() => {
    if (!storeId) return;
    getDeliveryCouriers(storeId).then((all) => {
      const match = all.find((c) => c.id === courierId) ?? null;
      setCourier(match);
      if (match) {
        getManualCourierOrders(storeId, match.name).then(setOrders);
      } else {
        setOrders([]);
      }
    });
  }, [storeId, courierId]);

  if (userLoading || featureLoading || courier === undefined) {
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
    return <FeatureLocked />;
  }

  if (!courier) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground">{t.admin.deliveryCourierNotFound}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-slate-400 to-slate-600 flex items-center justify-center shrink-0">
            <Truck size={18} color="white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white m-0 tracking-tight leading-tight">
              {courier.name}
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 m-0">
              {t.admin.courierPageSubtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-5 sm:py-7 space-y-5">
        <div className="flex items-start gap-2.5 rounded-2xl border border-blue-100 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-4">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
            {t.admin.deliveryCourierManualNote.replaceAll("{name}", courier.name)}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-2.5">
            {t.admin.pathaoShipmentsTitle}
          </h2>

          {orders === null ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center">
              <p className="text-sm text-muted-foreground">{t.admin.loading}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center">
              <PackageSearch className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.admin.pathaoNoShipmentsTitle}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {orders.map((o) => (
                <div
                  key={o.orderId}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
                >
                  <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/orders?search=${encodeURIComponent(o.orderNumber)}`}
                      className="text-sm font-medium text-foreground hover:underline"
                    >
                      #{o.orderNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">{o.recipientName}</p>
                  </div>
                  <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
