"use client";

import React from "react";
import { UseFormReturn, Controller } from "react-hook-form";
import { ProductType } from "@/lib/schema/productSchema";
import { ProductVariantType } from "@/lib/schema/varientSchema";
import FormField from "./FormField";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateDiscountedPrice } from "@/lib/hook/useDiscountCalculation";

interface ProductVariantsInlineProps {
  form: UseFormReturn<ProductType>;
}

const ProductVariantsInline: React.FC<ProductVariantsInlineProps> = ({
  form,
}) => {
  const variants = form.watch("variants") ?? [];

  const handleAddVariant = () => {
    form.setValue("variants", [
      ...variants,
      {
        variant_name: "",
        sku: "",
        weight: 0,
        color: "",
        stock: 0,
        is_active: true,
        attributes: null,
        base_price: 0,
        tp_price: 0,
        discounted_price: 0,
        discount_amount: 0,
      } as ProductVariantType,
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    form.setValue(
      "variants",
      variants.filter((_, i) => i !== index)
    );
  };

  const variantErrors = form.formState.errors.variants as
    | (
        | Partial<Record<keyof ProductVariantType, { message?: string }>>
        | undefined
      )[]
    | undefined;

  const updateVariantDiscountedPrice = (idx: number) => {
    const variant = variants[idx];
    const discounted = calculateDiscountedPrice(
      Number(variant.base_price || 0),
      Number(variant.discount_amount || 0)
    );
    if (form.getValues(`variants.${idx}.discounted_price`) !== discounted) {
      form.setValue(`variants.${idx}.discounted_price`, discounted);
    }
  };

  return (
    <div className="col-span-1 md:col-span-2 space-y-6">
      {variants.map((variant, idx) => {
        const error = variantErrors?.[idx] || {};

        return (
          <div
            key={idx}
            className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200 space-y-4"
          >
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

            {/* ---------------- Variant Info Section ---------------- */}
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Variant Info</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  label="Variant Name"
                  name={`variants.${idx}.variant_name`}
                  required
                />
                <FormField
                  control={form.control}
                  label="SKU"
                  name={`variants.${idx}.sku`}
                  required
                />
                <FormField
                  control={form.control}
                  label="Color"
                  name={`variants.${idx}.color`}
                  required
                />
                <FormField
                  control={form.control}
                  label="Weight (Kg)"
                  name={`variants.${idx}.weight`}
                  type="number"
                />
              </div>
            </div>

            {/* ---------------- Pricing Section ---------------- */}
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Pricing Info</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  label="TP Price (BDT)"
                  name={`variants.${idx}.tp_price`}
                  type="number"
                  required
                />
                <FormField
                  control={form.control}
                  label="MRP (BDT)"
                  name={`variants.${idx}.base_price`}
                  type="number"
                  required
                  onChange={() => updateVariantDiscountedPrice(idx)}
                />
                <FormField
                  control={form.control}
                  label="Discount Amount (BDT)"
                  name={`variants.${idx}.discount_amount`}
                  type="number"
                  onChange={() => updateVariantDiscountedPrice(idx)}
                />
                <FormField
                  control={form.control}
                  label="Discounted Price (BDT)"
                  name={`variants.${idx}.discounted_price`}
                  type="number"
                  disabled
                  readOnly
                />
              </div>
            </div>

            {/* ---------------- Stock & Attributes Section ---------------- */}
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Stock & Attributes</h5>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                {/* Left: Stock (small width) */}
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    label="Stock"
                    name={`variants.${idx}.stock`}
                    type="number"
                    required
                  />
                </div>

                {/* Right: Attributes (larger width) */}
                <div className="col-span-4">
                  <Controller
                    control={form.control}
                    name={`variants.${idx}.attributes`}
                    defaultValue={variant.attributes ?? null}
                    render={({ field, fieldState }) => {
                      const valueAsString =
                        typeof field.value === "string"
                          ? field.value
                          : field.value && typeof field.value === "object"
                          ? Object.entries(field.value)
                              .map(([k, v]) => `${k}-${v}`)
                              .join(", ")
                          : "";

                      return (
                        <div>
                          <label className="block mb-1 font-medium">
                            Attributes (Size-M, Color-Red)
                          </label>
                          <textarea
                            className="w-full border rounded-md p-2"
                            placeholder="Size-M, Color-Red"
                            value={valueAsString}
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (!val) {
                                field.onChange(null);
                                return;
                              }
                              const obj: Record<string, string> = {};
                              val.split(",").forEach((pair) => {
                                const [key, value] = pair
                                  .split("-")
                                  .map((s) => s.trim());
                                if (key && value !== undefined)
                                  obj[key] = value;
                              });
                              field.onChange(
                                Object.keys(obj).length ? obj : null
                              );
                            }}
                          />
                          {(fieldState.error || error.attributes?.message) && (
                            <p className="text-red-500 text-sm mt-1">
                              {fieldState.error?.message ||
                                error.attributes?.message}
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
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
