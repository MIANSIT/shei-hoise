// File: app/components/admin/dashboard/store-settings/storeCard/StoreSettingsCard.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, X, Check, Info } from "lucide-react";
import type {
  StoreSettings,
  UpdatedStoreSettings,
} from "@/lib/types/store/store";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { Currency, CURRENCY_ICONS } from "@/lib/types/enums";

interface SettingRowProps {
  label: string;
  value?: string | number | null;
  info?: string;
  editing?: boolean;
  readOnly?: boolean;
  options?: { label: string; value: string | number }[];
  onChange?: (val: string | number) => void;
  suffix?: string;
}

function SettingRow({
  label,
  value,
  info,
  editing,
  onChange,
  options,
  readOnly,
  suffix,
}: SettingRowProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="flex items-center justify-between py-3.5 px-3 rounded-xl hover:bg-muted/30 transition-colors group">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {info && (
          <div className="relative flex items-center">
            <button
              onMouseEnter={() => setShowInfo(true)}
              onMouseLeave={() => setShowInfo(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
            {showInfo && (
              <div className="absolute left-5 bottom-0 z-50 w-56 rounded-xl bg-popover border border-border shadow-xl px-3 py-2.5 text-xs text-muted-foreground leading-relaxed pointer-events-none">
                {info}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="ml-4 shrink-0">
        {editing && options ? (
          <select
            value={value ?? ""}
            onChange={(e) => onChange?.(e.target.value)}
            className="bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 px-2.5 py-1.5 rounded-lg text-sm outline-none text-foreground w-32 cursor-pointer"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : editing ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={value ?? ""}
              readOnly={readOnly}
              onChange={(e) => onChange?.(Number(e.target.value))}
              className="bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 px-2.5 py-1.5 rounded-lg text-sm outline-none text-right w-24 text-foreground tabular-nums"
            />
            {suffix && (
              <span className="text-sm text-muted-foreground">{suffix}</span>
            )}
          </div>
        ) : (
          <span className="text-sm font-semibold text-foreground tabular-nums bg-muted/50 px-2.5 py-1 rounded-lg">
            {value}
          </span>
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
        notify.success("Store settings updated!");
      } catch (err) {
        console.error(err);
        notify.error("Failed to update settings.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ ...settings });
    setEditing(false);
  };

  const currencyIcon = CURRENCY_ICONS[formData.currency as Currency] ?? "";

  return (
    <Card className="border-0 shadow-sm bg-card ring-1 ring-border/60 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Store Settings
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Operational parameters & policies
            </p>
          </div>
          {editing ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                className="h-8 px-3 text-xs font-semibold gap-1.5"
                onClick={handleSubmit}
                disabled={loading}
              >
                <Check className="h-3.5 w-3.5" />
                {loading ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs font-medium gap-1.5"
                onClick={handleCancel}
                disabled={loading}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-medium gap-1.5 hover:bg-muted/50"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-2.5">
        <div className="space-y-0">
          <SettingRow
            label="Currency"
            value={
              editing
                ? formData.currency
                : `${currencyIcon} ${formData.currency}`
            }
            info="Primary currency for all transactions"
            editing={editing}
            options={Object.values(Currency).map((cur) => ({
              label: `${CURRENCY_ICONS[cur]} ${cur}`,
              value: cur,
            }))}
            onChange={(val) => handleChange("currency", String(val))}
          />
          <SettingRow
            label="Tax Rate"
            value={editing ? formData.tax_rate : `${formData.tax_rate}%`}
            info="Applied as a percentage to all orders"
            editing={editing}
            suffix="%"
            onChange={(val) => handleChange("tax_rate", Number(val))}
          />
          <SettingRow
            label="Minimum Order"
            value={
              editing
                ? formData.min_order_amount
                : `${currencyIcon} ${formData.min_order_amount}`
            }
            info="Minimum amount required to place an order"
            editing={editing}
            suffix={currencyIcon}
            onChange={(val) => handleChange("min_order_amount", Number(val))}
          />
          <SettingRow
            label="Processing Time"
            value={
              editing
                ? formData.processing_time_days
                : `${formData.processing_time_days} days`
            }
            info="Average time to process and ship orders"
            editing={editing}
            suffix="days"
            onChange={(val) =>
              handleChange("processing_time_days", Number(val))
            }
          />
          <SettingRow
            label="Return Window"
            value={
              editing
                ? formData.return_policy_days
                : `${formData.return_policy_days} days`
            }
            info="Timeframe customers can return items"
            editing={editing}
            suffix="days"
            onChange={(val) => handleChange("return_policy_days", Number(val))}
          />
          <SettingRow
            label="Free Shipping At"
            value={
              editing
                ? formData.free_shipping_threshold
                : `${currencyIcon} ${formData.free_shipping_threshold}`
            }
            info="Orders above this amount qualify for free shipping"
            editing={editing}
            suffix={currencyIcon}
            onChange={(val) =>
              handleChange("free_shipping_threshold", Number(val))
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
