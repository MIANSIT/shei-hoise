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
import { useTranslation } from "@/lib/hook/useTranslation";
import { Currency, CURRENCY_ICONS } from "@/lib/types/enums";

interface SettingRowProps {
  label: string;
  value?: string | number | null;
  info?: string;
  editing?: boolean;
  readOnly?: boolean;
  type?: "text" | "number";
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
  type = "number",
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
        ) : editing && type === "text" ? (
          <input
            type="text"
            value={value ?? ""}
            readOnly={readOnly}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder="Pixel ID"
            className="bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 px-2.5 py-1.5 rounded-lg text-sm outline-none w-44 text-foreground"
          />
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
  const t = useTranslation();

  const handleChange = (field: keyof StoreSettings, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (onUpdate) {
      try {
        setLoading(true);
        await onUpdate(formData);
        setEditing(false);
        notify.success(t.admin.storeMgmtSettingsOk);
      } catch (err) {
        console.error(err);
        notify.error(t.admin.storeMgmtSettingsFail);
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
              {t.admin.storeMgmtSettings}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t.admin.storeMgmtSettingsDesc}
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
                {loading ? t.admin.storeMgmtSaving : t.admin.storeMgmtSave}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs font-medium gap-1.5"
                onClick={handleCancel}
                disabled={loading}
              >
                <X className="h-3.5 w-3.5" />
                {t.admin.storeMgmtCancel}
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
              {t.admin.storeMgmtEdit}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-2.5">
        <div className="space-y-0">
          <SettingRow
            label={t.admin.storeMgmtCurrency}
            value={
              editing
                ? formData.currency
                : `${currencyIcon} ${formData.currency}`
            }
            info={t.admin.storeMgmtCurrencyInfo}
            editing={editing}
            options={Object.values(Currency).map((cur) => ({
              label: `${CURRENCY_ICONS[cur]} ${cur}`,
              value: cur,
            }))}
            onChange={(val) => handleChange("currency", String(val))}
          />
          <SettingRow
            label={t.admin.storeMgmtTaxRate}
            value={editing ? formData.tax_rate : `${formData.tax_rate}%`}
            info={t.admin.storeMgmtTaxRateInfo}
            editing={editing}
            suffix="%"
            onChange={(val) => handleChange("tax_rate", Number(val))}
          />
          <SettingRow
            label={t.admin.storeMgmtMinOrder}
            value={
              editing
                ? formData.min_order_amount
                : `${currencyIcon} ${formData.min_order_amount}`
            }
            info={t.admin.storeMgmtMinOrderInfo}
            editing={editing}
            suffix={currencyIcon}
            onChange={(val) => handleChange("min_order_amount", Number(val))}
          />
          <SettingRow
            label={t.admin.storeMgmtProcessingTime}
            value={
              editing
                ? formData.processing_time_days
                : `${formData.processing_time_days} ${t.admin.storeMgmtDaysSuffix}`
            }
            info={t.admin.storeMgmtProcessingInfo}
            editing={editing}
            suffix={t.admin.storeMgmtDaysSuffix}
            onChange={(val) =>
              handleChange("processing_time_days", Number(val))
            }
          />
          <SettingRow
            label={t.admin.storeMgmtReturnWindow}
            value={
              editing
                ? formData.return_policy_days
                : `${formData.return_policy_days} ${t.admin.storeMgmtDaysSuffix}`
            }
            info={t.admin.storeMgmtReturnInfo}
            editing={editing}
            suffix={t.admin.storeMgmtDaysSuffix}
            onChange={(val) => handleChange("return_policy_days", Number(val))}
          />
          <SettingRow
            label={t.admin.storeMgmtFreeShipping}
            value={
              editing
                ? formData.free_shipping_threshold
                : `${currencyIcon} ${formData.free_shipping_threshold}`
            }
            info={t.admin.storeMgmtFreeShippingInfo}
            editing={editing}
            suffix={currencyIcon}
            onChange={(val) =>
              handleChange("free_shipping_threshold", Number(val))
            }
          />
          <SettingRow
            label={t.admin.storeMgmtFbPixel}
            value={formData.facebook_pixel_id ?? ""}
            info={t.admin.storeMgmtFbPixelInfo}
            editing={editing}
            type="text"
            onChange={(val) => handleChange("facebook_pixel_id", String(val) || null)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
