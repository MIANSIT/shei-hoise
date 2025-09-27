import React from "react";
import { Trash2, Edit2 } from "lucide-react";
import { ProductVariantType, ProductType } from "@/lib/schema/productSchema";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";

interface ProductVariantsProps {
  form: UseFormReturn<ProductType>;
  setEditingVariant: (v: ProductVariantType) => void;
  setVariantDialogOpen: (open: boolean) => void;
}

const ProductVariants: React.FC<ProductVariantsProps> = ({ form, setEditingVariant, setVariantDialogOpen }) => {
  const variants = form.watch("variants") ?? [];

  const handleDelete = (variant: ProductVariantType) => {
    const updated = variants.filter((v) => v !== variant);
    form.setValue("variants", updated);
  };

  return (
    <div className="col-span-1 md:col-span-2 flex flex-col space-y-2">
      <label className="text-sm font-medium">Variants</label>
      <div className="flex gap-2 flex-wrap">
        {variants.map((v, idx) => (
          <div
            key={idx}
            className="group relative flex items-center gap-2 border px-3 py-1 rounded hover:bg-gray-50 transition"
          >
            <span>{v.variant_name}</span>

            {/* Edit Icon */}
            <Edit2
              className="hidden group-hover:inline-block w-4 h-4 text-blue-500 cursor-pointer"
              onClick={() => {
                setEditingVariant(v);
                setVariantDialogOpen(true);
              }}
            />

            {/* Delete Icon */}
            <Trash2
              className="hidden group-hover:inline-block w-4 h-4 text-red-500 cursor-pointer"
              onClick={() => handleDelete(v)}
            />
          </div>
        ))}
            <Button type="button" variant="destructive" onClick={() => setVariantDialogOpen(true)}>
          + Add Variant
        </Button>
      </div>
    </div>
  );
};

export default ProductVariants;
