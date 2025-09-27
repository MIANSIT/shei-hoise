"use client";

import React from "react";

interface Option {
  label: string;
  value: string | number;
}

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value?: string | number;
  checked?: boolean;
  onChange?: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  required?: boolean;
  placeholder?: string;
  error?: string;
  as?: "input" | "textarea" | "select";
  options?: Option[];
  readOnly?: boolean;

  // numeric attributes
  min?: number;
  max?: number;
  step?: number;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = "text",
  value,
  checked,
  onChange,
  required,
  placeholder,
  error,
  as = "input",
  options = [],
  readOnly = false,

  step,
}) => {
  return (
    <div
      className="flex flex-col w-full scroll-mt-24"
      id={`field-${name}`} // scroll target
    >
      {label && (
        <label htmlFor={name} className="text-sm font-medium mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {as === "textarea" ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`border rounded-md px-3 py-2 w-full resize-none ${
            error ? "border-red-400" : ""
          }`}
        />
      ) : as === "select" ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={readOnly}
          className={`border rounded-md px-3 py-2 w-full ${
            error ? "border-red-400" : ""
          }`}
        >
          <option value="">Select an option</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={type === "checkbox" ? undefined : value}
          checked={type === "checkbox" ? checked : undefined}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          readOnly={readOnly}
          step={step}
          className={`border rounded-md px-3 py-2 w-full ${
            error ? "border-red-400" : ""
          }`}
        />
      )}

      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default FormField;
