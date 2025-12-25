"use client";

import { Card, CardContent } from "@/components/ui/card";
import SettingItem from "@/app/components/admin/dashboard/store-settings/SettingItem";
import {
  DollarSign,
  Globe,
  Percent,
  CreditCard,
  Clock,
  Package,
  Truck,
  Award,
  CalendarDays,
  Settings,
} from "lucide-react";
import { useState } from "react";
import EditOperationalSettingsModal from "./EditOperationalSettingsModal";
import type {
  StoreSettings,
  UpdatedStoreSettings,
} from "@/lib/types/store/store"; // Use correct path
import { CURRENCY_LABELS } from "@/lib/types/enums";
interface OperationalSettingsCardProps {
  settings: StoreSettings;
  onSettingsUpdate?: (updatedSettings: UpdatedStoreSettings) => Promise<void>;
}

export default function OperationalSettingsCard({
  settings,
  onSettingsUpdate,
}: OperationalSettingsCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleSave = async (updatedData: UpdatedStoreSettings) => {
    try {
      console.log("Updated operational settings:", updatedData);

      if (onSettingsUpdate) {
        await onSettingsUpdate(updatedData);
      }
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Operational Settings
        </h2>
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Edit Settings
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Currency & Tax Card */}
        <Card className="rounded-2xl border border-gray-200/70 bg-white hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Currency & Tax
              </h3>
            </div>
            <div className="space-y-4">
              <SettingItem
                label="Currency"
                value={CURRENCY_LABELS[settings.currency]}
                icon={<Globe className="w-4 h-4" />}
              />
              {/* Note: Tax rate field doesn't exist in StoreSettings type */}
              {/* You might want to add it or use a different field */}
              <SettingItem
                label="Tax Rate"
                value={`${settings.tax_rate} ${
                  CURRENCY_LABELS[settings.currency].split(" ")[1]
                }`}
                icon={<Percent className="w-4 h-4" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Settings Card */}
        <Card className="rounded-2xl border border-gray-200/70 bg-white hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Order Settings
              </h3>
            </div>
            <div className="space-y-4">
              {/* Note: min_order_amount doesn't exist in StoreSettings type */}
              {/* You might want to add it or use a different field */}
              <SettingItem
                label="Min Order Amount"
                value={
                  settings.min_order_amount != null
                    ? `${settings.min_order_amount} ${
                        CURRENCY_LABELS[settings.currency].split(" ")[1]
                      }`
                    : null
                }
                icon={<CreditCard className="w-4 h-4" />}
              />

              <SettingItem
                label="Processing Time"
                value={`${settings.processing_time_days || 0} days`}
                icon={<Clock className="w-4 h-4" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Shipping Card */}
        <Card className="rounded-2xl border border-gray-200/70 bg-white hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Shipping</h3>
            </div>
            <div className="space-y-4">
              {/* Note: free_shipping_threshold doesn't exist in StoreSettings type */}
              <SettingItem
                label="Free Shipping Threshold"
                value={
                  settings.free_shipping_threshold != null
                    ? `${settings.free_shipping_threshold} (${
                        CURRENCY_LABELS[settings.currency].split(" ")[1]
                      })`
                    : null
                }
                icon={<Award className="w-4 h-4" />}
              />
              <SettingItem
                label="Return Policy"
                value={settings.return_policy_days || "Not set"}
                icon={<CalendarDays className="w-4 h-4" />}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <EditOperationalSettingsModal
        settings={settings}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
