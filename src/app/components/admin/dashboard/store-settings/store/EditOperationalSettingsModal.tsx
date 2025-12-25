"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "antd";
import {
  DollarSign,
  Percent,
  Package,
  Truck,
  Clock,
  CalendarDays,
  Settings,
  Globe,
  CreditCard,
} from "lucide-react";
import type {
  StoreSettings,
  UpdatedStoreSettings,
} from "@/lib/types/store/store"; // Use correct p
import { Currency, CURRENCY_LABELS } from "@/lib/types/enums";

interface EditOperationalSettingsModalProps {
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: Partial<StoreSettings>) => Promise<void>;
}

export default function EditOperationalSettingsModal({
  settings,
  isOpen,
  onClose,
  onSave,
}: EditOperationalSettingsModalProps) {
  const [formData, setFormData] = useState({
    currency: settings.currency,
    tax_rate: settings.tax_rate,
    min_order_amount: settings.min_order_amount,
    processing_time_days: settings.processing_time_days,
    free_shipping_threshold: settings.free_shipping_threshold,
    return_policy_days: settings.return_policy_days,
    // Track whether free shipping is enabled
    is_free_shipping_enabled: settings.free_shipping_threshold !== null,
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    if (type === "number") {
      const numValue = value === "" ? null : parseFloat(value);
      setFormData((prev) => ({
        ...prev,
        [name]: numValue,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleToggleFreeShipping = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      is_free_shipping_enabled: checked,
      // If enabling, set a default value if none exists
      free_shipping_threshold: checked
        ? prev.free_shipping_threshold || 500
        : null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updatedData: UpdatedStoreSettings = {
        currency: formData.currency,
        tax_rate: formData.tax_rate,
        min_order_amount: formData.min_order_amount,
        processing_time_days: formData.processing_time_days,
        free_shipping_threshold: formData.free_shipping_threshold,
        return_policy_days: formData.return_policy_days,
      };

      await onSave(updatedData);
      onClose();
    } catch (error) {
      console.error("Error updating settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Edit Operational Settings
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Currency & Tax Settings */}
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-medium text-blue-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Currency & Tax
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Currency<span className="text-red-600">*</span>
                </Label>
                <select
                  id="currency"
                  name="currency"
                  required
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      currency: e.target.value as Currency,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.values(Currency).map((currency) => (
                    <option key={currency} value={currency}>
                      {CURRENCY_LABELS[currency]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_rate" className="flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Tax Rate (%)
                </Label>
                <Input
                  id="tax_rate"
                  name="tax_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.tax_rate}
                  onChange={handleInputChange}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Order Settings */}
          <div className="space-y-4 p-4 bg-orange-50 rounded-lg">
            <h3 className="text-lg font-medium text-orange-900 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="min_order_amount"
                  className="flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Minimum Order Amount
                </Label>
                <Input
                  id="min_order_amount"
                  name="min_order_amount"
                  type="number"
                  min="0"
                  value={formData.min_order_amount}
                  onChange={handleInputChange}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="processing_time_days"
                  className="flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Processing Time (Days)<span className="text-red-600">*</span>
                </Label>
                <Input
                  id="processing_time_days"
                  name="processing_time_days"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.processing_time_days}
                  onChange={handleInputChange}
                  className="w-full"
                  required
                />
              </div>
            </div>
          </div>

          {/* Shipping Settings */}
          <div className="space-y-4 p-4 bg-green-50 rounded-lg">
            <h3 className="text-lg font-medium text-green-900 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Shipping & Returns
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div className="space-y-1">
                  <Label className="font-medium">Free Shipping Threshold</Label>
                  <p className="text-sm text-gray-500">
                    Enable free shipping for orders above a certain amount
                  </p>
                </div>
                <Switch
                  checked={formData.is_free_shipping_enabled}
                  onChange={handleToggleFreeShipping}
                />
              </div>

              {formData.is_free_shipping_enabled && (
                <div className="space-y-2">
                  <Label htmlFor="free_shipping_threshold">
                    Free Shipping Minimum Amount
                  </Label>
                  <Input
                    id="free_shipping_threshold"
                    name="free_shipping_threshold"
                    type="number"
                    min="0"
                    value={formData.free_shipping_threshold || ""}
                    onChange={handleInputChange}
                    className="w-full"
                    placeholder="Enter minimum amount for free shipping"
                  />
                  <p className="text-sm text-gray-500">
                    Orders above this amount will qualify for free shipping
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="return_policy_days"
                  className="flex items-center gap-2"
                >
                  <CalendarDays className="w-4 h-4" />
                  Return Policy (Days) <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="return_policy_days"
                  name="return_policy_days"
                  type="number"
                  min="1"
                  max="365"
                  required
                  value={formData.return_policy_days}
                  onChange={handleInputChange}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">
                  Number of days customers have to return products
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
