"use client";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { ShippingManager } from "@/app/components/shipping/ShippingManager";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useEffect } from "react";

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
      <div className=" flex items-center justify-center ">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading store information...</p>
        </div>
      </div>
    );
  }

  if (!storeSlug) {
    return (
      <div className=" flex items-center justify-center p-4">
        <div className=" rounded-2xl shadow-2xl shadow-gray-200/50 p-8 max-w-md w-full text-center border ">
          <div className="w-16 h-16  rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Store Not Found
          </h1>
          <p className="text-gray-600">
            Unable to load your store information. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className=" py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-linear-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent mb-2">
                Shipping Management
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl">
                Configure delivery methods, shipping costs, and manage your
                store&apos;s shipping strategy
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Store:</span>
              <span className="font-medium text-gray-900 bg-white px-3 py-1 rounded-lg border border-gray-200">
                {storeSlug}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <ShippingManager storeSlug={storeSlug} />
      </div>
    </div>
  );
}
