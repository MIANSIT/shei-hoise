"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Receipt } from "lucide-react";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";
import type { ShippingFee } from "@/lib/types/store/store";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface ShippingMethodProps {
  storeSlug: string;
  subtotal: number;
  selectedShipping: string;
  onShippingChange: (shippingMethod: string, shippingFee: number) => void;
  minOrderAmount?: number;
}

export default function ShippingMethod({
  storeSlug,
  subtotal,
  selectedShipping,
  onShippingChange,
  minOrderAmount = 0,
}: ShippingMethodProps) {
  const [shippingOptions, setShippingOptions] = useState<ShippingFee[]>([]);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [storeMinOrderAmount, setStoreMinOrderAmount] = useState<number>(0);

  const { icon: currencyIcon, loading: currencyLoading } = useUserCurrencyIcon();
  const displayCurrencyIcon = currencyLoading ? "৳" : (currencyIcon ?? "৳");

  // Only show options where customer_view is NOT false (i.e., visible to customers)
  const visibleShippingOptions = useMemo(() => {
    return shippingOptions.filter(
      (option) => option.customer_view !== false
    );
  }, [shippingOptions]);

  // Check if subtotal meets the minimum order amount (if any)
  const meetsMinOrderAmount = useMemo(() => {
    const effectiveMinAmount = minOrderAmount || storeMinOrderAmount;
    return effectiveMinAmount <= 0 || subtotal >= effectiveMinAmount;
  }, [minOrderAmount, storeMinOrderAmount, subtotal]);

  // Fetch store settings once
  useEffect(() => {
    const fetchShippingOptions = async () => {
      try {
        const storeId = await getStoreIdBySlug(storeSlug);
        if (!storeId) return;

        const storeSettings = await getStoreSettings(storeId);
        if (!storeSettings) return;

        const options = storeSettings.shipping_fees || [];

        setShippingOptions(options);
        setTaxAmount(storeSettings.tax_rate || 0);

        if (!minOrderAmount) {
          setStoreMinOrderAmount(storeSettings.min_order_amount || 0);
        }

        // If no shipping method is selected yet, pick the first visible one as default
        if (!selectedShipping) {
          const visible = options.filter(
            (option: ShippingFee) => option.customer_view !== false
          );

          if (visible.length > 0) {
            const defaultOption = visible[0];
            // Always use the original price – no free shipping threshold
            onShippingChange(defaultOption.name, defaultOption.price);
          }
        }
      } catch (error) {
        console.error("Error fetching shipping options:", error);
      }
    };

    fetchShippingOptions();
  }, [storeSlug, minOrderAmount, selectedShipping, onShippingChange]);

  const handleShippingChange = useCallback(
    (value: string) => {
      if (!meetsMinOrderAmount) return;

      const selectedOption = visibleShippingOptions.find(
        (option) => option.name === value
      );

      if (!selectedOption) return;

      // Always pass the option's original price
      onShippingChange(value, selectedOption.price);
    },
    [visibleShippingOptions, onShippingChange, meetsMinOrderAmount]
  );

  if (visibleShippingOptions.length === 0) return null;

  return (
    <Card className="bg-muted/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-500" />
          Shipping & Tax
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedShipping}
          onValueChange={handleShippingChange}
          className="space-y-3"
        >
          {visibleShippingOptions.map((option, index) => (
            <div key={index} className="flex items-center space-x-3">
              <RadioGroupItem
                value={option.name}
                id={`shipping-${index}`}
                className="text-blue-600 border-gray-300"
                disabled={!meetsMinOrderAmount}
              />

              <Label
                htmlFor={`shipping-${index}`}
                className={`flex-1 cursor-pointer flex justify-between items-center ${
                  !meetsMinOrderAmount ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground uppercase">
                    {option.name}
                    {!meetsMinOrderAmount && (
                      <span className="text-xs text-yellow-600 ml-2">
                        (Minimum order required)
                      </span>
                    )}
                  </span>

                  {option.description && (
                    <span className="text-sm text-muted-foreground uppercase">
                      {option.description}
                    </span>
                  )}

                  {option.estimated_days && (
                    <span className="text-xs text-blue-600">
                      Est. {option.estimated_days} days
                    </span>
                  )}
                </div>

                <span className="font-semibold text-foreground">
                  {displayCurrencyIcon}
                  {option.price.toFixed(2)}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {taxAmount > 0 && (
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                Tax Amount
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-purple-700">
                Additional tax fee
              </span>
              <span className="font-semibold text-purple-800">
                {displayCurrencyIcon}
                {taxAmount.toFixed(2)}
              </span>
            </div>

            <p className="text-xs text-purple-600 mt-1">
              * Fixed tax amount applied to all orders
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}