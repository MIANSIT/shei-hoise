// app/admin/shipping/page.tsx
"use client";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { ShippingManager } from "@/app/components/shipping/ShippingManager";

export default function AdminShippingPage() {
  const { storeSlug, loading: userLoading } = useCurrentUser();

  if (userLoading) {
    return (
      <div className=" flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!storeSlug) {
    return (
      <div className=" flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold  mb-2">Store Not Found</h1>
          <p className="">Unable to load store information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="  py-4">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold ">Shipping Management</h1>
          <p className=" mt-2">
            Manage your store&apos;s shipping options and fees
          </p>
        </div>

        <ShippingManager storeSlug={storeSlug} />
      </div>
    </div>
  );
}
