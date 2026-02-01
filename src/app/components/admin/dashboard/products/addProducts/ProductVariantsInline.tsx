"use client";

import React, { useEffect, useState } from "react";
import { UseFormReturn, Controller } from "react-hook-form";
import { ProductType } from "@/lib/schema/productSchema";
import { ProductVariantType } from "@/lib/schema/varientSchema";
import FormField from "./FormField";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateDiscountedPrice } from "@/lib/hook/useDiscountCalculation";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

interface ProductVariantsInlineProps {
  form: UseFormReturn<ProductType>;
  addIsActive?: boolean;
}

const ProductVariantsInline: React.FC<ProductVariantsInlineProps> = ({
  form,
  addIsActive = true,
}) => {
  const variants = form.watch("variants") ?? [];
  const { setValue } = form;
  const { currency, loading: currencyLoading } = useUserCurrencyIcon();
  const displayCurrency = currencyLoading ? "" : (currency ?? "");

  // --- Variant pricing state ---
  const [variantPricing, setVariantPricing] = useState<
    { priceMode: "percentage" | "multiplier"; priceValue: number | "" }[]
  >(() =>
    variants.map(() => ({
      priceMode: "percentage",
      priceValue: "",
    })),
  );

  // --- Attribute text state (per variant) ---
  const [attrTexts, setAttrTexts] = useState<string[]>(
    variants.map((v) =>
      v.attributes
        ? Object.entries(v.attributes)
            .map(([k, val]) => `${k}-${val}`)
            .join(", ")
        : "",
    ),
  );

  // --- Sync variantPricing & attrTexts when variants added/removed ---
  useEffect(() => {
    setVariantPricing((prev) =>
      variants.map(
        (_, idx) => prev[idx] || { priceMode: "percentage", priceValue: "" },
      ),
    );
    setAttrTexts((prev) =>
      variants.map(
        (v, idx) =>
          prev[idx] ??
          (v.attributes
            ? Object.entries(v.attributes)
                .map(([k, val]) => `${k}-${val}`)
                .join(", ")
            : ""),
      ),
    );
  }, [variants.length]);

  // --- Add / Remove variant ---
  const handleAddVariant = () => {
    form.setValue("variants", [
      ...variants,
      {
        variant_name: "",
        sku: "",
        weight: undefined,
        color: "",
        stock: undefined,
        is_active: true,
        attributes: null,
        base_price: undefined,
        tp_price: undefined,
        discounted_price: undefined,
        discount_amount: undefined,
      } as ProductVariantType,
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    form.setValue(
      "variants",
      variants.filter((_, i) => i !== index),
    );
  };

  // --- Pricing calculations ---
  const updateVariantMRP = (
    idx: number,
    tp: number,
    val: number,
    mode: "percentage" | "multiplier",
  ) => {
    const mrp = mode === "percentage" ? tp * (1 + val / 100) : tp * val;
    setValue(`variants.${idx}.base_price`, Number(mrp.toFixed(2)), {
      shouldDirty: true,
      shouldValidate: true,
    });

    const discount = variants[idx]?.discount_amount ?? 0;
    const discounted = calculateDiscountedPrice(mrp, discount);
    setValue(`variants.${idx}.discounted_price`, discounted);
  };

  const handleVariantPriceModeChange = (
    idx: number,
    mode: "percentage" | "multiplier",
  ) => {
    setVariantPricing((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, priceMode: mode } : v)),
    );

    const tp = variants[idx]?.tp_price ?? 0;
    const val = variantPricing[idx]?.priceValue ?? 0;
    if (tp && val !== "") updateVariantMRP(idx, tp, val, mode);
  };

  const handleVariantPriceValueChange = (idx: number, val: number | "") => {
    setVariantPricing((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, priceValue: val } : v)),
    );

    const tp = variants[idx]?.tp_price ?? 0;
    const mode = variantPricing[idx]?.priceMode ?? "percentage";
    if (tp && val !== "" && mode) updateVariantMRP(idx, tp, val, mode);
  };

  const updateVariantDiscountedPrice = (idx: number) => {
    const variant = variants[idx];
    const discounted = calculateDiscountedPrice(
      Number(variant.base_price || 0),
      Number(variant.discount_amount || 0),
    );
    setValue(`variants.${idx}.discounted_price`, discounted);
  };

  // --- Errors ---
  const variantErrors = form.formState.errors.variants as
    | (
        | Partial<Record<keyof ProductVariantType, { message?: string }>>
        | undefined
      )[]
    | undefined;

  return (
    <div className="col-span-1 md:col-span-2 space-y-6">
      {variants.map((variant, idx) => {
        const error = variantErrors?.[idx] || {};
        const isActive = form.watch(`variants.${idx}.is_active`) ?? true;

        return (
          <div
            key={idx}
            className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200 space-y-4"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-lg">Variant {idx + 1}</h4>
              <Button
                type="button"
                variant="destructive"
                className="p-2"
                onClick={() => handleRemoveVariant(idx)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Active Toggle */}
            {addIsActive && (
              <div className="flex items-center space-x-3 mt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register(`variants.${idx}.is_active`)}
                    defaultChecked={variant.is_active ?? true}
                    className="sr-only peer"
                  />
                  <div
                    className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500
                      after:content-[''] after:absolute after:top-0.5 after:left-0.5
                      after:bg-white after:border after:border-gray-300 after:rounded-full
                      after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"
                  ></div>
                </label>
                <span
                  className={`text-sm font-medium ${
                    isActive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
                <Tooltip
                  title="Toggle to activate or deactivate this variant. Inactive variants will not be available for purchase."
                  placement="top"
                >
                  <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer" />
                </Tooltip>
              </div>
            )}

            {/* Variant Info */}
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700 dark:text-gray-400">
                Variant Info
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  label="Variant Name"
                  placeholder="Size, Color"
                  name={`variants.${idx}.variant_name`}
                  required
                />
                <FormField
                  control={form.control}
                  label="SKU"
                  placeholder="Unique variant code"
                  name={`variants.${idx}.sku`}
                  required
                />
                <FormField
                  control={form.control}
                  label="Color"
                  name={`variants.${idx}.color`}
                />
                <FormField
                  control={form.control}
                  label="Weight (Kg)"
                  placeholder="0.75"
                  name={`variants.${idx}.weight`}
                  type="number"
                />
              </div>
            </div>

            {/* Attributes */}
            <div className="space-y-2">
              <Controller
                control={form.control}
                name={`variants.${idx}.attributes`}
                defaultValue={variant.attributes ?? null}
                render={({ field, fieldState }) => (
                  <div>
                    <label className="block mb-1 font-medium">
                      Attributes (Input Like: Size-M, Color-Red)
                    </label>
                    <textarea
                      className="w-full border rounded-md p-2"
                      placeholder="Input Like: Size-M, Color-Red"
                      value={attrTexts[idx] || ""}
                      onChange={(e) => {
                        const newAttrTexts = [...attrTexts];
                        newAttrTexts[idx] = e.target.value;
                        setAttrTexts(newAttrTexts);
                      }}
                      onBlur={() => {
                        const val = (attrTexts[idx] || "").trim();
                        if (!val) return field.onChange(null);

                        const obj: Record<string, string> = {};
                        val.split(",").forEach((pair) => {
                          const [key, value] = pair
                            .split("-")
                            .map((s) => s.trim());
                          if (key && value !== undefined) obj[key] = value;
                        });

                        field.onChange(Object.keys(obj).length ? obj : null);
                      }}
                    />
                    {(fieldState.error?.message ||
                      error.attributes?.message) && (
                      <p className="text-red-500 text-sm mt-1">
                        {fieldState.error?.message || error.attributes?.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>

            {/* Pricing */}
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700 dark:text-gray-400">
                Pricing Info
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  label={`TP Price (${displayCurrency})`}
                  name={`variants.${idx}.tp_price`}
                  type="number"
                  onChange={() => {
                    const val = variantPricing[idx]?.priceValue ?? 0;
                    const mode = variantPricing[idx]?.priceMode ?? "percentage";
                    const tp = form.getValues(`variants.${idx}.tp_price`) ?? 0;
                    if (tp && val !== "" && mode)
                      updateVariantMRP(idx, tp, val, mode);
                  }}
                />
                <div className="w-full md:max-w-lg xl:max-w-xl">
                  <label className="mb-1 block text-sm font-medium">
                    Price Markup
                  </label>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <select
                      className="w-full md:w-fit rounded-md border px-3 py-2"
                      value={variantPricing[idx]?.priceMode ?? "percentage"}
                      onChange={(e) =>
                        handleVariantPriceModeChange(
                          idx,
                          e.target.value as "percentage" | "multiplier",
                        )
                      }
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="multiplier">Multiplier (×)</option>
                    </select>

                    <input
                      type="number"
                      className="w-full md:w-fit min-w-20 rounded-md border px-3 py-2"
                      placeholder={
                        variantPricing[idx]?.priceMode === "percentage"
                          ? "20"
                          : "1.2"
                      }
                      value={variantPricing[idx]?.priceValue ?? ""}
                      onChange={(e) =>
                        handleVariantPriceValueChange(
                          idx,
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  label={`MRP Price (${displayCurrency})`}
                  name={`variants.${idx}.base_price`}
                  type="number"
                  onChange={() => updateVariantDiscountedPrice(idx)}
                />
                <FormField
                  control={form.control}
                  label={`Discount Amount (${displayCurrency})`}
                  name={`variants.${idx}.discount_amount`}
                  type="number"
                  onChange={() => updateVariantDiscountedPrice(idx)}
                />
                <FormField
                  control={form.control}
                  label={`Discounted Price (${displayCurrency})`}
                  name={`variants.${idx}.discounted_price`}
                  type="number"
                  readOnly
                />
              </div>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                label="Stock"
                name={`variants.${idx}.stock`}
                type="number"
              />
            </div>
          </div>
        );
      })}

      <Button type="button" variant="greenish" onClick={handleAddVariant}>
        + Add Variant
      </Button>
    </div>
  );
};

export default ProductVariantsInline;
