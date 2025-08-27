"use client";
import React from "react";
import FormField from "./FormField";
import { ProductFormValues } from "../../../../../../lib/utils/formSchema";

interface StockFieldsProps {
  discount: number | string;
  stock: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors?: Partial<Record<keyof ProductFormValues, string>>; // 👈 add errors
}

const StockFields: React.FC<StockFieldsProps> = ({
  discount,
  stock,
  onChange,
  errors,
}) => {
  return (
    <div className="flex gap-4 w-full">
      {/* Discount */}
      <div className="flex-1">
        <FormField
          label="Discount"
          name="discount"
          type="number"
          placeholder="Discount (%)"
          value={discount}
          onChange={onChange}
        />
        {errors?.discount && (
          <p className="text-red-400 text-sm mt-1">{errors.discount}</p>
        )}
      </div>

      {/* Stock */}
      <div className="flex-1">
        <FormField
          label="Stock"
          name="stock"
          type="number"
          placeholder="Stock"
          value={stock}
          onChange={onChange}
        />
        {errors?.stock && (
          <p className="text-red-400 text-sm mt-1">{errors.stock}</p>
        )}
      </div>
    </div>
  );
};

export default StockFields;
