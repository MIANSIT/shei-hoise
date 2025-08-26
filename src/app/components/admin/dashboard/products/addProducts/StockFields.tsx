"use client";
import React from "react";
import FormField from "./FormField";

interface StockFieldsProps {
  discount: number | string;
  stock: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const StockFields: React.FC<StockFieldsProps> = ({
  discount,
  stock,
  onChange,
}) => {
  return (
    <div className="flex gap-4 w-full">
      <div className="flex-1">
        <FormField
          label="Discount"
          name="discount"
          type="number"
          placeholder="Discount (%)" // 👈 placeholder instead of label text
          value={discount}
          onChange={onChange}
        />
      </div>
      <div className="flex-1">
        <FormField
          label="Stock"
          name="stock"
          type="number"
          placeholder="Stock" // 👈 placeholder inside input
          value={stock}
          onChange={onChange}
        />
      </div>
    </div>
  );
};

export default StockFields;
