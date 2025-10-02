// File: components/forms/ProductVariantsInline.tsx
"use client";

import React from "react";
import { UseFormReturn, Controller } from "react-hook-form";
import { ProductType } from "@/lib/schema/productSchema";
import { ProductVariantType } from "@/lib/schema/varientSchema";
import FormField from "./FormField";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        price: 0,
        weight: 0,
        color: "",
        stock: 0,
        is_active: true,
        attributes: {}, // JSON object
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

  return (
    <div className="col-span-1 md:col-span-2 space-y-4">
      {variants.map((variant, idx) => {
        const error = variantErrors?.[idx] || {};
        return (
          <div
            key={idx}
            className="border rounded-lg p-6 shadow-sm relative grid grid-cols-1 md:grid-cols-3 gap-4 bg-white hover:shadow-md transition-shadow duration-200"
          >
            <div className="col-span-full flex justify-between items-center mb-4">
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

            <FormField
              control={form.control}
              label="Name"
              name={`variants.${idx}.variant_name`}
              required
              error={error.variant_name?.message}
            />
            <FormField
              control={form.control}
              label="SKU"
              name={`variants.${idx}.sku`}
              required
              error={error.sku?.message}
            />
            <FormField
              control={form.control}
              label="Price"
              name={`variants.${idx}.price`}
              type="number"
              required
              error={error.price?.message}
            />
            <FormField
              control={form.control}
              label="Weight"
              name={`variants.${idx}.weight`}
              type="number"
              error={error.weight?.message}
            />
            <FormField
              control={form.control}
              label="Color"
              name={`variants.${idx}.color`}
              error={error.color?.message}
            />
            <FormField
              control={form.control}
              label="Stock"
              name={`variants.${idx}.stock`}
              type="number"
              required
              error={error.stock?.message}
            />

            {/* Attributes as JSON object */}
            <Controller
              control={form.control}
              name={`variants.${idx}.attributes`}
              defaultValue={variant.attributes ?? {}}
              render={({ field, fieldState }) => {
                const valueAsString =
                  typeof field.value === "object"
                    ? JSON.stringify(field.value, null, 2)
                    : field.value;
                return (
                  <div className="col-span-full">
                    <label className="block mb-1 font-medium">
                      Attributes (JSON)
                    </label>
                    <textarea
                      className="w-full border rounded-md p-2 min-h-[60px]"
                      value={valueAsString}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          field.onChange(parsed);
                        } catch {
                          field.onChange(e.target.value);
                        }
                      }}
                    />
                    {(fieldState.error || error.attributes?.message) && (
                      <p className="text-red-500 text-sm mt-1">
                        {fieldState.error?.message || error.attributes?.message}
                      </p>
                    )}
                  </div>
                );
              }}
            />
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
