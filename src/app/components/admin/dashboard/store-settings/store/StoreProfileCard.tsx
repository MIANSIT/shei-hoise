"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Store, BadgeCheck, ExternalLink, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import EditStoreProfileModal from "./EditStoreProfileModal";
import type { StoreData } from "@/lib/types/store/store";

interface StoreProfileCardProps {
  store: StoreData;
  onStoreUpdate?: (updatedStore: Partial<StoreData>) => Promise<void>;
}

export default function StoreProfileCard({
  store,
  onStoreUpdate,
}: StoreProfileCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Construct the public store URL
  const publicStoreUrl = `/${store.store_slug}`;

  const handleSave = async (updatedData: Partial<StoreData>) => {
    try {
      console.log("Updated store data:", updatedData);

      if (onStoreUpdate) {
        await onStoreUpdate(updatedData);
      }
    } catch (error) {
      console.error("Error updating store:", error);
    }
  };

  return (
    <>
      <Card className="rounded-2xl border border-gray-200/70 bg-linear-to-br from-white to-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
        {/* Banner */}
        <div className="relative h-48 bg-linear-to-r from-blue-600 to-indigo-600">
          {store.banner_url ? (
            <Image
              src={store.banner_url}
              alt="Store Banner"
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white/20">
                <Store className="w-32 h-32" />
              </div>
            </div>
          )}
          {/* Logo */}
          <div className="absolute -bottom-12 left-8">
            <div className="relative w-24 h-24 rounded-2xl border-4 border-white bg-white shadow-xl">
              {store.logo_url ? (
                <Image
                  src={store.logo_url}
                  alt="Store Logo"
                  fill
                  className="object-cover rounded-lg"
                  priority
                />
              ) : (
                <div className="w-full h-full rounded-lg bg-linear-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                  <Store className="w-12 h-12 text-blue-600" />
                </div>
              )}
            </div>
          </div>
        </div>

        <CardContent className="pt-16 pb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {store.store_name}
                {store.is_active && (
                  <BadgeCheck className="w-6 h-6 text-green-500" />
                )}
              </h2>
              <p className="text-gray-600 mt-1">@{store.store_slug}</p>
              <div className="flex items-center gap-2 mt-2">
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    store.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : store.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : store.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : store.status === "trail"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {store.status.charAt(0).toUpperCase() + store.status.slice(1)}
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    store.is_active
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {store.is_active ? "Active" : "Inactive"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Edit Profile
              </button>

              {/* View Public Button with Link */}
              <Link
                href={publicStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <span>View Public</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <EditStoreProfileModal
        store={store}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
