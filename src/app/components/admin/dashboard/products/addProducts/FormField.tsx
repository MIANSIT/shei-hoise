"use client";
import React from "react";

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string; // 👈 added
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  required,
  placeholder,
}) => {
  return (
    <div className="flex flex-col w-full">
      {label && (
        <label htmlFor={name} className="text-sm font-medium mb-1">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder} // 👈 now supported
        className="border rounded-md px-3 py-2 w-full"
      />
    </div>
  );
};

export default FormField;
