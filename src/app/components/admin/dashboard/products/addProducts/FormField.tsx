// File: components/forms/FormField.tsx
"use client";

import React from "react";
import { Controller, Control, FieldValues, Path } from "react-hook-form";

type Option = { label: string; value: string | number };

type BaseProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  required?: boolean;
  // error?: string | null;
  readOnly?: boolean;
  disabled?: boolean; // <-- add this
  placeholder?: string;
  onChange?: (value: T[Path<T>]) => void;
  className?: string; // <-- add this
};

// Input
type InputFieldProps<T extends FieldValues> = BaseProps<T> & {
  as?: "input";
  type?: "text" | "email" | "password" | "number";
};

// Textarea
type TextareaFieldProps<T extends FieldValues> = BaseProps<T> & {
  as: "textarea";
};

// Select
type SelectFieldProps<T extends FieldValues> = BaseProps<T> & {
  as: "select";
  options?: Option[];
};

// Checkbox
type CheckboxFieldProps<T extends FieldValues> = BaseProps<T> & {
  as: "checkbox";
};

// Number
type NumberFieldProps<T extends FieldValues> = BaseProps<T> & {
  as?: "input";
  type: "number";
};

export type FormFieldProps<T extends FieldValues> =
  | InputFieldProps<T>
  | TextareaFieldProps<T>
  | SelectFieldProps<T>
  | CheckboxFieldProps<T>
  | NumberFieldProps<T>;

const FormField = <T extends FieldValues>(props: FormFieldProps<T>) => {
  const { control, name, label, required, onChange } = props as BaseProps<T>;

  const commonClasses =
    "w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500";

  const readOnlyClasses = "bg-gray-100 text-gray-600 cursor-not-allowed";

  const extraClass = props.className ?? "";
  return (
    <div className="flex flex-col w-full scroll-mt-24" id={`field-${name}`}>
      {label && (
        <label htmlFor={name} className="text-sm font-semibold mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => {
          // TEXTAREA
          if ("as" in props && props.as === "textarea") {
            const p = props as TextareaFieldProps<T>;
            return (
              <>
                <textarea
                  id={name}
                  {...field}
                  placeholder={p.placeholder}
                  className={`${commonClasses}${extraClass} resize-none min-h-[80px]`}
                  disabled={p.readOnly}
                  onChange={(e) => {
                    field.onChange(e.target.value as T[Path<T>]);
                    onChange?.(e.target.value as T[Path<T>]);
                  }}
                  value={field.value ?? ""}
                />
                <p className="text-red-500 text-sm mt-1">
                  {fieldState.error?.message}
                </p>
              </>
            );
          }

          // SELECT
          if ("as" in props && props.as === "select") {
            const p = props as SelectFieldProps<T>;
            return (
              <>
                <select
                  id={name}
                  {...field}
                  value={field.value ?? ""}
                  className={commonClasses}
                  disabled={p.readOnly}
                  onChange={(e) => {
                    field.onChange(e.target.value as T[Path<T>]);
                    onChange?.(e.target.value as T[Path<T>]);
                  }}
                >
                  {p.placeholder && (
                    <option value="" disabled hidden>
                      {p.placeholder}
                    </option>
                  )}
                  {p.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-red-500 text-sm mt-1">
                  {fieldState.error?.message}
                </p>
              </>
            );
          }

          // CHECKBOX
          if ("as" in props && props.as === "checkbox") {
            const p = props as CheckboxFieldProps<T>;
            return (
              <>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!!field.value}
                    onChange={(e) => {
                      field.onChange(e.target.checked as T[Path<T>]);
                      onChange?.(e.target.checked as T[Path<T>]);
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                    disabled={p.disabled || p.readOnly}
                  />
                  <span>{p.label}</span>
                </div>
                <p className="text-red-500 text-sm mt-1">
                  {fieldState.error?.message}
                </p>
              </>
            );
          }

          // NUMBER or DEFAULT INPUT
          // NUMBER or DEFAULT INPUT
          const p = props as InputFieldProps<T> | NumberFieldProps<T>;
          const isNumber = p.type === "number";

          // Controlled value for input element
          const inputValue: string | number = isNumber
            ? field.value ?? "" // show "" when undefined
            : field.value ?? "";

          return (
            <>
              <input
                {...field}
                type={p.type ?? "text"}
                placeholder={p.placeholder}
                className={`${commonClasses} ${
                  p.readOnly ? readOnlyClasses : ""
                } ${extraClass}`}
                readOnly={p.readOnly} // make input actually read-only
                value={inputValue}
                onChange={(e) => {
                  let newValue: T[Path<T>];

                  if (isNumber) {
                    newValue =
                      e.target.value === ""
                        ? (undefined as unknown as T[Path<T>])
                        : (parseFloat(e.target.value) as T[Path<T>]);
                  } else {
                    newValue = e.target.value as T[Path<T>];
                  }

                  field.onChange(newValue);
                  onChange?.(newValue);
                }}
              />
              <p className="text-red-500 text-sm mt-1">
                {fieldState.error?.message}
              </p>
            </>
          );
        }}
      />
    </div>
  );
};

export default FormField;
