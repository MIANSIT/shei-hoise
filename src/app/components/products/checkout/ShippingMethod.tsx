// components/products/checkout/ShippingMethod.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck } from "lucide-react";
import {
  getStoreSettings,
  ShippingFee,
} from "@/lib/queries/stores/getStoreSettings";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";

interface ShippingMethodProps {
  storeSlug: string;
  subtotal: number;
  selectedShipping: string;
  onShippingChange: (shippingMethod: string, shippingFee: number) => void;
}

export default function ShippingMethod({
  storeSlug,
  subtotal,
  selectedShipping,
  onShippingChange,
}: ShippingMethodProps) {
  const [shippingOptions, setShippingOptions] = useState<ShippingFee[]>([]);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<
    number | null
  >(null);

  // Filter out "custom" shipping options
  const filteredShippingOptions = useMemo(() => {
    return shippingOptions.filter(option => 
      option.name.toLowerCase() !== "custom"
    );
  }, [shippingOptions]);

  // Fetch shipping options only once when component mounts
  useEffect(() => {
    const fetchShippingOptions = async () => {
      try {
        const storeId = await getStoreIdBySlug(storeSlug);

        if (storeId) {
          const storeSettings = await getStoreSettings(storeId);

          if (storeSettings) {
            setShippingOptions(storeSettings.shipping_fees || []);
            setFreeShippingThreshold(storeSettings.free_shipping_threshold);

            // Set default shipping method only if nothing is selected
            // Use filtered options for default selection
            const filteredOptions = storeSettings.shipping_fees?.filter(option => 
              option.name.toLowerCase() !== "custom"
            ) || [];
            
            if (filteredOptions.length > 0 && !selectedShipping) {
              const defaultShipping = filteredOptions[0];
              onShippingChange(defaultShipping.name, defaultShipping.price);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching shipping options:", error);
      }
    };

    fetchShippingOptions();
  }, [storeSlug]); // Only depend on storeSlug

  const handleShippingChange = useCallback((value: string) => {
    const selectedOption = filteredShippingOptions.find(
      (option) => option.name === value
    );
    if (selectedOption) {
      const shippingFee =
        freeShippingThreshold && subtotal >= freeShippingThreshold
          ? 0
          : selectedOption.price;
      onShippingChange(value, shippingFee);
    }
  }, [filteredShippingOptions, freeShippingThreshold, subtotal, onShippingChange]);

  const isFreeShipping =
    freeShippingThreshold && subtotal >= freeShippingThreshold;

  // If no shipping options available, don't show anything
  if (filteredShippingOptions.length === 0) {
    return null;
  }

  return (
    <Card className="bg-muted/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-500" />
          Shipping Method
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedShipping}
          onValueChange={handleShippingChange}
          className="space-y-3"
        >
          {filteredShippingOptions.map((option, index) => (
            <div key={index} className="flex items-center space-x-3">
              <RadioGroupItem
                value={option.name}
                id={`shipping-${index}`}
                className="text-blue-600 border-gray-300"
              />
              <Label
                htmlFor={`shipping-${index}`}
                className="flex-1 cursor-pointer flex justify-between items-center"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground uppercase">
                    {option.name}
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
                  {isFreeShipping ? (
                    <span className="text-green-600">FREE</span>
                  ) : (
                    `৳${option.price.toFixed(2)}`
                  )}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {/* Free Shipping Progress - Only show if free_shipping_threshold exists */}
        {freeShippingThreshold && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-blue-700">
                {isFreeShipping
                  ? "🎉 You've unlocked free shipping!"
                  : `Add ৳${(freeShippingThreshold - subtotal).toFixed(
                      2
                    )} for free shipping`}
              </span>
              <span className="text-blue-700 font-medium">
                ৳{subtotal.toFixed(2)} / ৳{freeShippingThreshold.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    (subtotal / freeShippingThreshold) * 100,
                    100
                  )}%`,
                }}
              ></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}