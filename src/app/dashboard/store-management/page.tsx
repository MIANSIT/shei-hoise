"use client";

import Image from "next/image";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStoreSettings } from "@/lib/hook/stores/useStoreSettings";
import { useStore } from "@/lib/hook/stores/useStore";
import { SettingItem } from "@/app/components/admin/dashboard/store-settings/SettingItem";
import { PolicyBlock } from "@/app/components/admin/dashboard/store-settings/PolicyBlock";
import { Tabs, Card, Button, Spin, Collapse, Tag } from "antd";

export default function StoreSettingsPage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const { settings, loading, error } = useStoreSettings(storeId);
  const { store, loading: storeLoading } = useStore(storeId);

  if (userLoading || loading || storeLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!storeId) {
    return <div className="p-6 text-red-500">No store assigned</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Failed to load settings</div>;
  }

  if (!settings) {
    return <div className="p-6 text-gray-500">No settings found</div>;
  }

  const tabItems = [
    {
      key: "1",
      label: "Basic Settings",
      children: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SettingItem label="Currency" value={settings.currency} />
          <SettingItem label="Tax Rate" value={`${settings.tax_rate}%`} />
          <SettingItem
            label="Free Shipping Threshold"
            value={settings.free_shipping_threshold ?? "N/A"}
          />
          <SettingItem
            label="Min Order Amount"
            value={settings.min_order_amount}
          />
          <SettingItem
            label="Processing Time"
            value={`${settings.processing_time_days} days`}
          />
          <SettingItem
            label="Return Policy"
            value={`${settings.return_policy_days} days`}
          />
        </div>
      ),
    },
    {
      key: "2",
      label: "Shipping Fees",
      children: (
        <div className="grid md:grid-cols-2 gap-6">
          {(settings.shipping_fees ?? []).map((fee, index) => (
            <Card
              key={index}
              title={fee.name}
              extra={`৳${fee.price}`}
              hoverable
            >
              {fee.description && (
                <p className="text-gray-500">{fee.description}</p>
              )}
            </Card>
          ))}
        </div>
      ),
    },
    {
      key: "3",
      label: "Policies",
      children: (
        <Collapse
          accordion
          items={[
            {
              key: "terms",
              label: "Terms & Conditions",
              children: (
                <div
                  style={{
                    maxHeight: "400px",
                    overflowY: "auto",
                    paddingRight: "8px",
                  }}
                >
                  <PolicyBlock
                    title="Terms & Conditions"
                    content={settings.terms_and_conditions}
                  />
                </div>
              ),
            },
            {
              key: "privacy",
              label: "Privacy Policy",
              children: (
                <div
                  style={{
                    maxHeight: "400px",
                    overflowY: "auto",
                    paddingRight: "8px",
                  }}
                >
                  <PolicyBlock
                    title="Privacy Policy"
                    content={settings.privacy_policy}
                  />
                </div>
              ),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Store Header */}
      <div className="space-y-4">
        {/* Banner */}
        <div className="w-full h-48 relative rounded-md overflow-hidden shadow-sm">
          {store?.banner_url ? (
            <Image
              src={store.banner_url}
              alt={`${store.store_name} Banner`}
              fill
              className="object-contain object-center"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
              No banner available
            </div>
          )}
        </div>

        {/* Logo + Info beside store name */}
        <div className="flex items-start gap-4 mt-4">
          {store?.logo_url && (
            <div className="w-20 h-20 relative rounded-md overflow-hidden border-2 border-gray-200">
              <Image
                src={store.logo_url}
                alt={`${store.store_name} Logo`}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-3xl font-bold">{store?.store_name}</h1>
                <p className="text-gray-500">@{store?.store_slug}</p>
              </div>
              <div className="flex gap-2">
                {store?.is_active ? (
                  <Tag color="green">Active</Tag>
                ) : (
                  <Tag color="red">Inactive</Tag>
                )}
                <Tag color="blue">{store?.status ?? "Unknown"}</Tag>
              </div>
            </div>

            {store?.description ? (
              <p className="text-gray-600 mt-1">{store.description}</p>
            ) : (
              <p className="text-gray-400 italic mt-1">
                No description available
              </p>
            )}

            <div className="mt-2 text-gray-600 text-sm space-y-1">
              {store?.contact_email && <p>Email: {store.contact_email}</p>}
              {store?.contact_phone && <p>Phone: {store.contact_phone}</p>}
              {store?.business_address && (
                <p>Address: {store.business_address}</p>
              )}
              {store?.business_license && (
                <p>Business License: {store.business_license}</p>
              )}
              {store?.tax_id && <p>Tax ID: {store.tax_id}</p>}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-4">
          <Button type="primary">Save Changes</Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultActiveKey="1" type="card" size="large" items={tabItems} />
    </div>
  );
}