"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { ProductType, ProductVariantType } from "@/lib/schema/productSchema";
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
    const updated = variants.filter((_, i) => i !== index);
    form.setValue("variants", updated);
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

  return (
    <div className="col-span-1 md:col-span-2 space-y-4">
      {variants.map((variant, idx) => (
        <div
          key={idx}
          className="border p-6 rounded relative  grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Button
            type="button"
            variant="destructive"
            className="absolute top-1 right-2"
            onClick={() => handleRemoveVariant(idx)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          <FormField
            label="Name"
            name={`variantName-${idx}`}
            value={variant.variant_name}
            onChange={(e) => handleChange(idx, "variant_name", e.target.value)}
          />
          <FormField
            label="SKU"
            name={`sku-${idx}`}
            value={variant.sku || ""}
            onChange={(e) => handleChange(idx, "sku", e.target.value)}
          />
          <FormField
            label="Price"
            name={`price-${idx}`}
            type="number"
            value={variant.price || 0}
            onChange={(e) =>
              handleChange(idx, "price", parseFloat(e.target.value))
            }
          />
          <FormField
            label="Weight"
            name={`weight-${idx}`}
            type="number"
            value={variant.weight || 0}
            onChange={(e) =>
              handleChange(idx, "weight", parseFloat(e.target.value))
            }
          />
          <FormField
            label="Color"
            name={`color-${idx}`}
            value={variant.color || ""}
            onChange={(e) => handleChange(idx, "color", e.target.value)}
          />
          <FormField
            label="Stock"
            name={`stock-${idx}`}
            type="number"
            value={variant.stock || 0}
            onChange={(e) =>
              handleChange(idx, "stock", parseInt(e.target.value))
            }
          />
          <FormField
            label="Attributes (JSON)"
            name={`attributes-${idx}`}
            as="textarea"
            value={JSON.stringify(variant.attributes || {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                if (typeof parsed === "object" && parsed !== null)
                  handleChange(idx, "attributes", parsed);
              } catch {}
            }}
          />
        </div>
      ))}

      <Button type="button" variant="greenish" onClick={handleAddVariant}>
        + Add Variant
      </Button>
    </div>
  );
};

export default ProductVariantsInline;
