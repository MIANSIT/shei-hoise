"use client";
import React from "react";
import FormField from "./FormField";
import { ProductFormValues } from "../../../../../../lib/utils/formSchema";

interface PriceFieldsProps {
  currentPrice: string;
  originalPrice: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors?: Partial<Record<keyof ProductFormValues, string>>; // 👈 add errors
}

const PriceFields: React.FC<PriceFieldsProps> = ({
  currentPrice,
  originalPrice,
  onChange,
  errors,
}) => {
  return (
    <div className="flex gap-4 w-full">
      {/* Current Price */}
      <div className="flex-1">
        <FormField
          type="number"
          label="Current Price"
          name="currentPrice"
          value={currentPrice}
          onChange={onChange}
          placeholder="Current Price"
        />
        {errors?.currentPrice && (
          <p className="text-red-400 text-sm mt-1">{errors.currentPrice}</p>
        )}
      </div>

      {/* Original Price */}
      <div className="flex-1">
        <FormField
          type="number"
          label="Original Price"
          name="originalPrice"
          value={originalPrice}
          onChange={onChange}
          placeholder="Original Price"
        />
        {errors?.originalPrice && (
          <p className="text-red-400 text-sm mt-1">{errors.originalPrice}</p>
        )}
      </div>
    </div>
  );
};

export default PriceFields;
