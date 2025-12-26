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
import type { StoreSettings } from "@/lib/types/store/store";

interface SettingItemProps {
  label: string;
  value?: string | number | null;
  description?: string;
  isHighlighted?: boolean;
  info?: string;
  editing?: boolean;
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
}: SettingItemProps) {
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
              {/* Tooltip - hidden on mobile, shown on hover for desktop */}
              <div className="hidden sm:group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-xs rounded-md bg-gray-800 text-white text-xs px-2 py-1 shadow-lg z-10">
                {info}
              </div>
              {/* Mobile tooltip - appears on click/tap */}
              <div className="sm:hidden absolute -top-8 left-0 w-max max-w-xs rounded-md bg-gray-800 text-white text-xs px-2 py-1 shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity">
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
        {editing ? (
          <input
            type="text"
            value={value ?? ""}
            onChange={(e) =>
              onChange
                ? onChange(
                    isNaN(Number(value))
                      ? e.target.value
                      : Number(e.target.value)
                  )
                : null
            }
            className="w-full sm:w-32 border px-2 py-1 rounded text-right text-sm sm:text-base"
          />
        ) : (
          <div className="text-base sm:text-lg font-semibold">{value}</div>
        )}
      </div>
    </div>
  );
}

export function StoreSettingsCard({ settings }: { settings: StoreSettings }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ ...settings });

  const handleChange = (field: keyof StoreSettings, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    console.log("Updated settings:", formData);
    setEditing(false);
    // Call API to save settings here
  };

  const handleCancel = () => {
    setFormData({ ...settings });
    setEditing(false);
  };

  const freeShipping = formData.free_shipping_threshold ?? 0;

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
                className="h-9 px-4 flex-1 sm:flex-none min-w-[100px]"
                onClick={handleSubmit}
              >
                <CheckOutlined className="mr-2 text-sm" />
                <span>Submit</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-4 flex-1 sm:flex-none min-w-[100px]"
                onClick={handleCancel}
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
                className="h-9 px-4 w-full sm:w-auto min-w-[120px]"
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
            onChange={(val) => handleChange("currency", String(val))}
          />

          <SettingItem
            label="Tax Rate"
            value={formData.tax_rate}
            info="Applied to all orders"
            isHighlighted
            editing={editing}
            onChange={(val) => handleChange("tax_rate", Number(val))}
          />

          <SettingItem
            label="Minimum Order Amount"
            value={formData.min_order_amount}
            info="Minimum amount required to place an order"
            isHighlighted
            editing={editing}
            onChange={(val) => handleChange("min_order_amount", Number(val))}
          />

          <SettingItem
            label="Order Processing Time"
            value={formData.processing_time_days}
            description="days"
            info="Average time to process and ship orders"
            isHighlighted
            editing={editing}
            onChange={(val) =>
              handleChange("processing_time_days", Number(val))
            }
          />

          <SettingItem
            label="Return Policy Period"
            value={formData.return_policy_days}
            description="days"
            info="Timeframe for customer returns"
            isHighlighted
            editing={editing}
            onChange={(val) => handleChange("return_policy_days", Number(val))}
          />

          <SettingItem
            label="Free Shipping Threshold"
            value={freeShipping}
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
