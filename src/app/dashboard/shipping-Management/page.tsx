"use client";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { ShippingManager } from "@/app/components/shipping/ShippingManager";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useEffect } from "react";
import { Truck, Store } from "lucide-react";

export default function AdminShippingPage() {
  const { storeSlug, loading: userLoading } = useCurrentUser();
  const { info } = useSheiNotification();

  useEffect(() => {
    if (storeSlug) {
      info(`Managing shipping for store: ${storeSlug}`);
    }
  }, [storeSlug, info]);

  if (userLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-700" />
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
              Loading
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Fetching store information…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!storeSlug) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-100 dark:border-red-900/40 shadow-xl p-10 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg
              className="w-7 h-7 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            Store Not Found
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Unable to load your store information. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900/50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mb-4 font-medium tracking-wide uppercase">
          <Store className="w-3.5 h-3.5" />
          <span>Store Settings</span>
          <span>/</span>
          <span className="text-slate-600 dark:text-slate-300">Shipping</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              <Truck className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Shipping
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Manage delivery methods &amp; costs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 shadow-sm self-start sm:self-auto">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Store
            </span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {storeSlug}
            </span>
          </div>
        </div>

        <ShippingManager storeSlug={storeSlug} />
      </div>
    </div>
  );
}
