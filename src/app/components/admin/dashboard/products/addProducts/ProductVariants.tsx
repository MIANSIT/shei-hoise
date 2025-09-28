"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
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
        attributes: {},
        stock: 0,
        is_active: true,
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    form.setValue(
      "variants",
      variants.filter((_, i) => i !== index)
    );
  };

  const handleChange = (
    index: number,
    field: keyof ProductVariantType,
    value: string | number | boolean | object
  ) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    form.setValue("variants", updated);
  };

  // TypeScript-safe error mapping for array
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
            className="border p-6 rounded relative grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="col-span-full flex justify-between items-center mb-2">
              <h4 className="font-medium text-lg">Variant {idx + 1}</h4>
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleRemoveVariant(idx)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <FormField
              label="Name"
              name={`variant_name-${idx}`}
              value={variant.variant_name}
              onChange={(e) =>
                handleChange(idx, "variant_name", e.target.value)
              }
              required
              error={error.variant_name?.message}
            />

            <FormField
              label="SKU"
              name={`sku-${idx}`}
              value={variant.sku || ""}
              onChange={(e) => handleChange(idx, "sku", e.target.value)}
              required
              error={error.sku?.message}
            />

            <FormField
              label="Price"
              name={`price-${idx}`}
              type="number"
              value={variant.price}
              onChange={(e) =>
                handleChange(idx, "price", parseFloat(e.target.value))
              }
              required
              error={error.price?.message}
            />

            <FormField
              label="Weight"
              name={`weight-${idx}`}
              type="number"
              value={variant.weight || 0}
              onChange={(e) =>
                handleChange(idx, "weight", parseFloat(e.target.value))
              }
              error={error.weight?.message}
            />

            <FormField
              label="Color"
              name={`color-${idx}`}
              value={variant.color || ""}
              onChange={(e) => handleChange(idx, "color", e.target.value)}
              required
              error={error.color?.message}
            />

            <FormField
              label="Stock"
              name={`stock-${idx}`}
              type="number"
              value={variant.stock}
              onChange={(e) =>
                handleChange(idx, "stock", parseInt(e.target.value))
              }
              required
              error={error.stock?.message}
            />

            <FormField
              label="Attributes (JSON)"
              name={`attributes-${idx}`}
              as="textarea"
              value={JSON.stringify(variant.attributes || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  if (parsed && typeof parsed === "object")
                    handleChange(idx, "attributes", parsed);
                } catch {}
              }}
              error={error.attributes?.message?.toString()}
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
