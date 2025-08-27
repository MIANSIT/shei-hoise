"use client";
import React from "react";
import FormField from "./FormField";

interface PriceFieldsProps {
  currentPrice: string;
  originalPrice: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PriceFields: React.FC<PriceFieldsProps> = ({
  currentPrice,
  originalPrice,
  onChange,
}) => {
  return (
    <div className="flex gap-4 w-full">
      <div className="flex-1">
        <FormField
          type="number" // 👈 only numbers allowed
          label="Current Price"
          name="currentPrice"
          value={currentPrice}
          onChange={onChange}
          placeholder="Current Price"
        />
      </div>
      <div className="flex-1">
        <FormField
          type="number" // 👈 only numbers allowed
          label="Original Price"
          name="originalPrice"
          value={originalPrice}
          onChange={onChange}
          placeholder="Original Price"
        />
      </div>
    </div>
  );
};

export default PriceFields;
