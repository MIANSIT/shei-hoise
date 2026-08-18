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
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";

interface ShippingMethodProps {
  storeSlug: string;
  subtotal: number;
  selectedShipping: string;
  onShippingChange: (shippingMethod: string, shippingFee: number) => void;
  minOrderAmount?: number;
  /** True when at least one cart item is a free-delivery product — the whole order then ships free. */
  hasFreeDeliveryProduct?: boolean;
}

export default function ShippingMethod({
  storeSlug,
  subtotal,
  selectedShipping,
  onShippingChange,
  minOrderAmount = 0,
  hasFreeDeliveryProduct = false,
}: ShippingMethodProps) {
  const [shippingOptions, setShippingOptions] = useState<ShippingFee[]>([]);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [storeMinOrderAmount, setStoreMinOrderAmount] = useState<number>(0);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(0);

  const { icon: currencyIcon, loading: currencyLoading } = useUserCurrencyIcon();
  const displayCurrencyIcon = currencyLoading ? "৳" : (currencyIcon ?? "৳");
  const t = useTranslation();
  const n = useLocalNum();

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

  // Delivery is free when the store's threshold is met, or when the cart holds
  // a product the admin marked as free delivery (any quantity, any mix of other
  // products — the whole order ships free either way).
  const qualifiesForFreeShipping = useMemo(() => {
    if (hasFreeDeliveryProduct) return true;
    return freeShippingThreshold > 0 && subtotal >= freeShippingThreshold;
  }, [hasFreeDeliveryProduct, freeShippingThreshold, subtotal]);

  const getEffectiveFee = useCallback(
    (price: number) => (qualifiesForFreeShipping ? 0 : price),
    [qualifiesForFreeShipping],
  );

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
        setFreeShippingThreshold(storeSettings.free_shipping_threshold || 0);

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
            const threshold = storeSettings.free_shipping_threshold || 0;
            const isFree =
              hasFreeDeliveryProduct ||
              (threshold > 0 && subtotal >= threshold);
            onShippingChange(defaultOption.name, isFree ? 0 : defaultOption.price);
          }
        }
      } catch (error) {
        console.error("Error fetching shipping options:", error);
      }
    };

    fetchShippingOptions();
    // subtotal is read for the initial fee only; later changes are handled by
    // the qualifiesForFreeShipping effect below, so it's intentionally omitted
    // here to avoid refetching shipping options on every quantity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSlug, minOrderAmount, selectedShipping, onShippingChange]);

  const handleShippingChange = useCallback(
    (value: string) => {
      if (!meetsMinOrderAmount) return;

      const selectedOption = visibleShippingOptions.find(
        (option) => option.name === value
      );

      if (!selectedOption) return;

      onShippingChange(value, getEffectiveFee(selectedOption.price));
    },
    [visibleShippingOptions, onShippingChange, meetsMinOrderAmount, getEffectiveFee]
  );

  // Re-evaluate the currently selected option's fee when the subtotal crosses
  // the free-shipping threshold (e.g. customer adjusts quantity on this page)
  useEffect(() => {
    if (!selectedShipping) return;

    const currentOption = visibleShippingOptions.find(
      (option) => option.name === selectedShipping
    );
    if (!currentOption) return;

    onShippingChange(selectedShipping, getEffectiveFee(currentOption.price));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualifiesForFreeShipping]);

  if (visibleShippingOptions.length === 0) return null;

  return (
    <Card className="bg-muted/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-500" />
          {t.checkout.shippingAndTax}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {hasFreeDeliveryProduct && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
            <Truck className="h-4 w-4 shrink-0 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              {t.checkout.freeDeliveryApplied}
            </span>
          </div>
        )}

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
                        {t.checkout.minOrderRequired}
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
                      {t.checkout.estimated} {n(option.estimated_days)} {t.checkout.days}
                    </span>
                  )}
                </div>

                <span className="font-semibold text-foreground">
                  {qualifiesForFreeShipping && option.price > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <span className="line-through text-muted-foreground text-xs font-normal">
                        {displayCurrencyIcon}
                        {n(option.price.toFixed(2))}
                      </span>
                      <span className="text-green-600">
                        {t.checkout.freeShippingLabel}
                      </span>
                    </span>
                  ) : (
                    <>
                      {displayCurrencyIcon}
                      {n(option.price.toFixed(2))}
                    </>
                  )}
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
                {t.checkout.taxAmount}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-purple-700">
                {t.checkout.additionalTaxFee}
              </span>
              <span className="font-semibold text-purple-800">
                {displayCurrencyIcon}
                {n(taxAmount.toFixed(2))}
              </span>
            </div>

            <p className="text-xs text-purple-600 mt-1">
              {t.checkout.fixedTaxNote}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}