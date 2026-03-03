"use client";

import React, { useEffect, useState } from "react";
import { UseFormReturn, Controller } from "react-hook-form";
import { ProductType } from "@/lib/schema/productSchema";
import { ProductVariantType } from "@/lib/schema/varientSchema";
import FormField from "./FormField";
import { Trash2, ChevronDown, ChevronUp, Layers, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateDiscountedPrice } from "@/lib/hook/useDiscountCalculation";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { Tooltip } from "antd";

interface ProductVariantsInlineProps {
  form: UseFormReturn<ProductType>;
  addIsActive?: boolean;
}

const FieldLabel = ({
  label,
  required,
  tooltip,
}: {
  label: string;
  required?: boolean;
  tooltip?: string;
}) => (
  <div className="mb-1.5 flex items-center gap-1.5">
    <label className="text-sm font-medium text-foreground">
      {label}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
    {tooltip && (
      <Tooltip title={tooltip} placement="top">
        <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground hover:text-foreground transition-colors" />
      </Tooltip>
    )}
  </div>
);

const ProductVariantsInline: React.FC<ProductVariantsInlineProps> = ({
  form,
  addIsActive = true,
}) => {
  const variants = form.watch("variants") ?? [];
  const { setValue } = form;
  const { currency, loading: currencyLoading } = useUserCurrencyIcon();
  const displayCurrency = currencyLoading ? "" : (currency ?? "");

  const [collapsedVariants, setCollapsedVariants] = useState<boolean[]>([]);

  const [variantPricing, setVariantPricing] = useState<
    { priceMode: "percentage" | "multiplier"; priceValue: number | "" }[]
  >(() => variants.map(() => ({ priceMode: "percentage", priceValue: "" })));

  const [attrTexts, setAttrTexts] = useState<string[]>(
    variants.map((v) =>
      v.attributes
        ? Object.entries(v.attributes)
            .map(([k, val]) => `${k}-${val}`)
            .join(", ")
        : "",
    ),
  );

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
    setCollapsedVariants((prev) =>
      variants.map((_, idx) => prev[idx] ?? false),
    );
  }, [variants.length]);

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

  const toggleCollapse = (idx: number) => {
    setCollapsedVariants((prev) =>
      prev.map((val, i) => (i === idx ? !val : val)),
    );
  };

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
    setValue(
      `variants.${idx}.discounted_price`,
      calculateDiscountedPrice(mrp, discount),
    );
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
    if (tp && val !== "") updateVariantMRP(idx, tp, val, mode);
  };

  const updateVariantDiscountedPrice = (idx: number) => {
    const variant = variants[idx];
    setValue(
      `variants.${idx}.discounted_price`,
      calculateDiscountedPrice(
        Number(variant.base_price || 0),
        Number(variant.discount_amount || 0),
      ),
    );
  };

  const variantErrors = form.formState.errors.variants as
    | (
        | Partial<Record<keyof ProductVariantType, { message?: string }>>
        | undefined
      )[]
    | undefined;

  if (variants.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 lg:p-8">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Layers className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">No variants yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add variants for different sizes, colors, or configurations.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleAddVariant}
            className="rounded-xl border border-emerald-600 bg-transparent px-5 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white"
          >
            + Add First Variant
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Layers className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Variants
            </h2>
            <p className="text-xs text-muted-foreground">
              {variants.length} variant{variants.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={handleAddVariant}
          className="rounded-xl border border-emerald-600 bg-transparent px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white"
        >
          + Add Variant
        </Button>
      </div>

      {variants.map((variant, idx) => {
        const error = variantErrors?.[idx] || {};
        const isActive = form.watch(`variants.${idx}.is_active`) ?? true;
        const isCollapsed = collapsedVariants[idx] ?? false;
        const variantLabel =
          form.watch(`variants.${idx}.variant_name`) || `Variant ${idx + 1}`;

        return (
          <div
            key={idx}
            className={`rounded-2xl border bg-card transition-shadow ${isActive ? "border-border" : "border-border opacity-70"}`}
          >
            {/* Variant header */}
            <div
              className="flex cursor-pointer items-center justify-between p-5"
              onClick={() => toggleCollapse(idx)}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${isActive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
                >
                  {idx + 1}
                </span>
                <span className="font-medium text-foreground">
                  {variantLabel}
                </span>
                {!isActive && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveVariant(idx);
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-500 transition-colors dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {!isCollapsed && (
              <div className="space-y-6 border-t border-border px-5 pb-6 pt-5">
                {/* Active toggle */}
                {addIsActive && (
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        {...form.register(`variants.${idx}.is_active`)}
                        defaultChecked={variant.is_active ?? true}
                        className="peer sr-only"
                      />
                      <div className="h-5 w-9 rounded-full bg-gray-200 transition-colors peer-checked:bg-emerald-500 dark:bg-gray-700 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                    <span
                      className={`text-sm font-medium ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                    >
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                )}

                {/* Basic info */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Basic Info
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel
                        label="Variant Name"
                        required
                        tooltip="E.g. Small, Medium, Red, 128GB"
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${idx}.variant_name`}
                        required
                        placeholder="e.g. Small, Red, 128GB"
                      />
                    </div>
                    <div>
                      <FieldLabel
                        label="SKU"
                        required
                        tooltip="Unique code. E.g. TSHIRT-001-S"
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${idx}.sku`}
                        required
                        placeholder="e.g. PROD-001-S"
                      />
                    </div>
                    <div>
                      <FieldLabel
                        label="Color"
                        tooltip="E.g. Black, Navy Blue"
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${idx}.color`}
                        placeholder="e.g. Black"
                      />
                    </div>
                    <div>
                      <FieldLabel
                        label="Weight (kg)"
                        tooltip="Used for shipping. E.g. 0.5, 1.2"
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${idx}.weight`}
                        type="number"
                        placeholder="e.g. 0.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Attributes */}
                <div>
                  <FieldLabel
                    label="Attributes"
                    tooltip="Key-Value pairs. E.g. Size-M, Material-Cotton, Fit-Slim"
                  />
                  <Controller
                    control={form.control}
                    name={`variants.${idx}.attributes`}
                    defaultValue={variant.attributes ?? null}
                    render={({ field, fieldState }) => (
                      <div>
                        <textarea
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-muted"
                          placeholder="e.g. Size-M, Material-Cotton, Fit-Slim"
                          rows={2}
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
                            field.onChange(
                              Object.keys(obj).length ? obj : null,
                            );
                          }}
                        />
                        {(fieldState.error?.message ||
                          error.attributes?.message) && (
                          <p className="mt-1 text-xs text-rose-500">
                            {fieldState.error?.message ||
                              error.attributes?.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                </div>

                {/* Pricing */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Pricing
                  </p>

                  {/* TP + Markup */}
                  <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <FieldLabel
                        label={`TP Price (${displayCurrency})`}
                        tooltip="Wholesale cost price for this variant."
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${idx}.tp_price`}
                        type="number"
                        placeholder="e.g. 100"
                        onChange={() => {
                          const val = variantPricing[idx]?.priceValue ?? 0;
                          const mode =
                            variantPricing[idx]?.priceMode ?? "percentage";
                          const tp =
                            form.getValues(`variants.${idx}.tp_price`) ?? 0;
                          if (tp && val !== "")
                            updateVariantMRP(idx, tp, val, mode);
                        }}
                      />
                    </div>

                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <FieldLabel
                        label="Price Markup (Auto-calculates MRP)"
                        tooltip="Add a markup to TP Price to calculate MRP. Percentage: 20% on TP 100 → MRP 120. Multiplier: 1.5× on TP 100 → MRP 150."
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-muted sm:w-auto"
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
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-muted"
                          placeholder={
                            variantPricing[idx]?.priceMode === "percentage"
                              ? "e.g. 20"
                              : "e.g. 1.5"
                          }
                          value={variantPricing[idx]?.priceValue ?? ""}
                          onChange={(e) =>
                            handleVariantPriceValueChange(
                              idx,
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            )
                          }
                        />
                      </div>
                      {/* Live calculation hint */}
                      {variantPricing[idx]?.priceValue !== "" &&
                      variantPricing[idx]?.priceValue !== undefined &&
                      form.watch(`variants.${idx}.tp_price`) ? (
                        <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                          {variantPricing[idx]?.priceMode === "percentage"
                            ? `${displayCurrency}${form.watch(`variants.${idx}.tp_price`)} + ${variantPricing[idx]?.priceValue}% = MRP ${displayCurrency}${(Number(form.watch(`variants.${idx}.tp_price`)) * (1 + Number(variantPricing[idx]?.priceValue) / 100)).toFixed(2)}`
                            : `${displayCurrency}${form.watch(`variants.${idx}.tp_price`)} × ${variantPricing[idx]?.priceValue} = MRP ${displayCurrency}${(Number(form.watch(`variants.${idx}.tp_price`)) * Number(variantPricing[idx]?.priceValue)).toFixed(2)}`}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* MRP / Discount / Final */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <FieldLabel
                        label={`MRP (${displayCurrency})`}
                        tooltip="Regular selling price."
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${idx}.base_price`}
                        type="number"
                        placeholder="e.g. 120"
                        onChange={() => updateVariantDiscountedPrice(idx)}
                      />
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <FieldLabel
                        label={`Discount (${displayCurrency})`}
                        tooltip="Amount off MRP."
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${idx}.discount_amount`}
                        type="number"
                        placeholder="e.g. 10"
                        onChange={() => updateVariantDiscountedPrice(idx)}
                      />
                    </div>
                    <div className="rounded-xl border border-border bg-emerald-500/5 p-3">
                      <FieldLabel
                        label={`Final Price (${displayCurrency})`}
                        tooltip="Auto-calculated: MRP − Discount."
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${idx}.discounted_price`}
                        type="number"
                        placeholder="Auto"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Stock */}
                <div className="max-w-xs">
                  <FieldLabel
                    label="Stock"
                    tooltip="Available inventory for this variant."
                  />
                  <FormField
                    control={form.control}
                    name={`variants.${idx}.stock`}
                    type="number"
                    placeholder="e.g. 50"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProductVariantsInline;
