"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  EditOutlined,
  InfoCircleOutlined,
  CloseOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import type {
  StoreSettings,
  UpdatedStoreSettings,
} from "@/lib/types/store/store";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { Currency, CURRENCY_ICONS } from "@/lib/types/enums";

interface SettingItemProps {
  label: string;
  value?: string | number | null;
  description?: string;
  isHighlighted?: boolean;
  info?: string;
  editing?: boolean;
  readOnly?: boolean;
  options?: { label: string; value: string | number }[];
  onChange?: (val: string | number) => void;
}

function SettingItem({
  label,
  value,
  description,
  isHighlighted,
  info,
  editing,
  onChange,
  options,
  readOnly,
}: SettingItemProps) {
  // displayValue only when not editing
  const displayValue = typeof value === "number" || typeof value === "string" ? value : "";

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg transition-colors relative ${
        isHighlighted
          ? "bg-secondary/5 border border-primary/10"
          : "hover:bg-muted/50"
      }`}
    >
      <div className="mb-2 sm:mb-0 flex-1">
        <div className="flex items-start sm:items-center gap-2 relative">
          <p className="font-medium text-sm sm:text-base">{label}</p>
          {info && (
            <div className="group relative flex items-center">
              <InfoCircleOutlined className="text-muted-foreground cursor-pointer text-sm sm:text-base" />
              <div className="hidden sm:group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-xs rounded-md bg-gray-800 text-white text-xs px-2 py-1 shadow-lg z-10">
                {info}
              </div>
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>

      <div className="text-right mt-1 sm:mt-0">
        {editing && options ? (
          <select
            value={value ?? ""}
            onChange={(e) => onChange?.(e.target.value)}
            className="w-full sm:w-32 border px-2 py-1 rounded text-right text-sm sm:text-base"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : editing ? (
          <input
            type="number"
            value={value ?? ""}
            readOnly={readOnly}
            onChange={(e) => onChange?.(Number(e.target.value))}
            className="w-full sm:w-32 border px-2 py-1 rounded text-right text-sm sm:text-base"
          />
        ) : (
          <div className="text-base sm:text-lg font-semibold">{displayValue}</div>
        )}
      </div>
    </div>
  );
}

interface StoreSettingsCardProps {
  settings: StoreSettings;
  onUpdate?: (updatedSettings: UpdatedStoreSettings) => Promise<void>;
}

export function StoreSettingsCard({
  settings,
  onUpdate,
}: StoreSettingsCardProps) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ ...settings });
  const [loading, setLoading] = useState(false);
  const notify = useSheiNotification();

  const handleChange = (field: keyof StoreSettings, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (onUpdate) {
      try {
        setLoading(true);
        await onUpdate(formData);
        setEditing(false);
        notify.success("Store Settings updated successfully!");
      } catch (err) {
        console.error("Failed to update settings:", err);
        notify.error("Failed to update Store Settings.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ ...settings });
    setEditing(false);
  };

  const currencyIcon =
    CURRENCY_ICONS[formData.currency as Currency] ?? "";

  return (
    <Card className="border shadow-sm">
      <CardHeader className="border-b p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <CardTitle className="text-lg sm:text-xl font-semibold">
            Store Settings
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Configure your store&apos;s operational parameters
            </p>
          </CardTitle>

          {editing ? (
            <div className="flex gap-2 justify-center sm:justify-end w-full sm:w-auto mt-2 sm:mt-0">
              <Button
                size="sm"
                variant="default"
                className="h-9 px-4 flex-1 sm:flex-none min-w-25"
                onClick={handleSubmit}
                disabled={loading}
              >
                <CheckOutlined className="mr-2 text-sm" />
                <span>Submit</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-4 flex-1 sm:flex-none min-w-25"
                onClick={handleCancel}
                disabled={loading}
              >
                <CloseOutlined className="mr-2 text-sm" />
                <span>Close</span>
              </Button>
            </div>
          ) : (
            <div className="flex justify-center sm:justify-end w-full sm:w-auto mt-2 sm:mt-0">
              <Button
                variant="default"
                size="sm"
                className="h-9 px-4 w-full sm:w-auto min-w-30"
                onClick={() => setEditing(true)}
              >
                <EditOutlined className="mr-2 text-sm" />
                <span>Edit Settings</span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <SettingItem
            label="Currency"
            value={formData.currency}
            info="Primary currency for all transactions"
            isHighlighted
            editing={editing}
            options={Object.values(Currency).map((cur) => ({
              label: `${CURRENCY_ICONS[cur]} ${cur}`,
              value: cur,
            }))}
            onChange={(val) => handleChange("currency", String(val))}
          />

          <SettingItem
            label="Tax Rate"
            value={
              editing
                ? formData.tax_rate
                : `${formData.tax_rate} ${currencyIcon}`
            }
            info="Applied to all orders"
            isHighlighted
            editing={editing}
            onChange={(val) => handleChange("tax_rate", Number(val))}
          />

          <SettingItem
            label="Minimum Order Amount"
            value={
              editing
                ? formData.min_order_amount
                : `${formData.min_order_amount} ${currencyIcon}`
            }
            info="Minimum amount required to place an order"
            isHighlighted
            editing={editing}
            onChange={(val) => handleChange("min_order_amount", Number(val))}
          />

          <SettingItem
            label="Order Processing Time"
            value={
              editing
                ? formData.processing_time_days
                : `${formData.processing_time_days} days`
            }
            info="Average time to process and ship orders"
            isHighlighted
            editing={editing}
            onChange={(val) =>
              handleChange("processing_time_days", Number(val))
            }
          />

          <SettingItem
            label="Return Policy Period"
            value={
              editing
                ? formData.return_policy_days
                : `${formData.return_policy_days} days`
            }
            info="Timeframe for customer returns"
            isHighlighted
            editing={editing}
            onChange={(val) => handleChange("return_policy_days", Number(val))}
          />

          <SettingItem
            label="Free Shipping Threshold"
            value={
              editing
                ? formData.free_shipping_threshold
                : `${formData.free_shipping_threshold} ${currencyIcon}`
            }
            info="Order amount to qualify for free shipping"
            isHighlighted
            editing={editing}
            onChange={(val) =>
              handleChange("free_shipping_threshold", Number(val))
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
