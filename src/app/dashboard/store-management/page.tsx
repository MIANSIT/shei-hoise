"use client";

import { Card, CardContent } from "@/components/ui/card";
import { SettingItem } from "@/app/components/admin/dashboard/store-settings/SettingItem";
import { PolicyBlock } from "@/app/components/admin/dashboard/store-settings/PolicyBlock";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStore } from "@/lib/hook/stores/useStore";
import { useStoreSettings } from "@/lib/hook/stores/useStoreSettings";
import { SheiSkeleton } from "@/app/components/ui/shei-skeleton";
import { Mail, Phone, MapPin, ShieldCheck, FileText } from "lucide-react";

export default function StoreManagementPage() {
  const { storeId } = useCurrentUser();
  const { store, loading: storeLoading } = useStore(storeId);
  const { settings, loading: settingsLoading } = useStoreSettings(storeId);

  const loading = storeLoading || settingsLoading;

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SheiSkeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!store) return null;

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Store Settings
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your store profile, contact details, and policies
        </p>
      </div>

      {/* Store Overview */}
      <Card className="rounded-xl border border-gray-200/70 bg-white hover:shadow-md transition-shadow">
        <CardContent className="p-6 space-y-6">
          <h2 className="text-lg font-medium text-gray-800">
            Store Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SettingItem label="Store Name" value={store.store_name} />
            <SettingItem label="Store Slug" value={store.store_slug} />
            <SettingItem label="Status" value={store.status} />
            <SettingItem
              label="Active"
              value={store.is_active ? "Yes" : "No"}
            />
            <SettingItem label="Tax ID" value={store.tax_id || "—"} />
            <SettingItem
              label="Business License"
              value={store.business_license || "—"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact & Address */}
      <Card className="rounded-xl border border-gray-200/70 bg-white hover:shadow-md transition-shadow">
        <CardContent className="p-6 space-y-6">
          <h2 className="text-lg font-medium text-gray-800">Contact Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SettingItem
              label="Contact Email"
              value={store.contact_email || "—"}
            />
            <SettingItem
              label="Contact Phone"
              value={store.contact_phone || "—"}
            />
            <SettingItem
              label="Business Address"
              value={store.business_address || "—"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Store Settings */}
      {settings && (
        <Card className="rounded-xl border border-gray-200/70 bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-800">
              Operational Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SettingItem label="Currency" value={settings.currency} />
              <SettingItem label="Tax Rate (%)" value={settings.tax_rate} />
              <SettingItem
                label="Processing Time (days)"
                value={settings.processing_time_days}
              />
              <SettingItem
                label="Return Policy (days)"
                value={settings.return_policy_days}
              />
              <SettingItem
                label="Minimum Order Amount"
                value={settings.min_order_amount}
              />
              <SettingItem
                label="Free Shipping Threshold"
                value={settings.free_shipping_threshold}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policies */}
      {settings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="rounded-xl border border-gray-200/70 bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <h2 className="text-lg font-medium text-gray-800">
                  Terms & Conditions
                </h2>
              </div>
              <PolicyBlock title="" content={settings.terms_and_conditions} />
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-gray-200/70 bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                <h2 className="text-lg font-medium text-gray-800">
                  Privacy Policy
                </h2>
              </div>
              <PolicyBlock title="" content={settings.privacy_policy} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
