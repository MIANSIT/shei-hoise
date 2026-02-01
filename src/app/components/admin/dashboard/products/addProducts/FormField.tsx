"use client";

import React from "react";
import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";

type Option = { label: string; value: string | number };

type BaseProps<T extends FieldValues> = {
  control?: Control<T>; // optional for react-hook-form
  value?: T[Path<T>]; // controlled input
  onChange?: (value: T[Path<T>]) => void; // controlled input
  name: Path<T>;
  label?: string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  tooltip?: string;
  as?: "input" | "textarea" | "select" | "checkbox";
  type?: "text" | "email" | "password" | "number"; // input type
  options?: Option[]; // for select
};

export type FormFieldProps<T extends FieldValues> = BaseProps<T>;

const FormField = <T extends FieldValues>(props: FormFieldProps<T>) => {
  const {
    control,
    value,
    onChange,
    name,
    label,
    required,
    readOnly,
    disabled,
    placeholder,
    className,
    tooltip,
    as = "input",
    type = "text",
    options = [],
  } = props;

  const commonClasses =
    "w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500";
  const readOnlyClasses = "bg-gray-100 text-gray-600 cursor-not-allowed";
  const extraClass = className ?? "";

  // Strongly typed field & error
  type FieldType = {
    value: T[Path<T>] | undefined;
    onChange: (value: T[Path<T>]) => void;
  };
  type FieldStateType = {
    error?: { message?: string };
  };

  const renderInput = (field: FieldType, fieldState?: FieldStateType) => {
    const inputValue =
      type === "number"
        ? field.value != null
          ? String(field.value)
          : ""
        : (field.value ?? "");

    if (as === "textarea") {
      return (
        <>
          <textarea
            id={name}
            placeholder={placeholder}
            className={`${commonClasses} ${extraClass} resize-none min-h-20`}
            disabled={readOnly || disabled}
            value={inputValue as string}
            onChange={(e) => {
              field.onChange(e.target.value as T[Path<T>]);
              onChange?.(e.target.value as T[Path<T>]);
            }}
          />
          {fieldState?.error?.message && (
            <p className="text-red-500 text-sm mt-1">
              {fieldState.error.message}
            </p>
          )}
        </>
      );
    }

    if (as === "select") {
      return (
        <>
          <select
            id={name}
            value={inputValue as string | number}
            disabled={readOnly || disabled}
            className={`${commonClasses} ${extraClass} 
    bg-white text-gray-700 border-gray-300 
    focus:ring-gray-500 focus:border-gray-500
    dark:bg-black dark:text-gray-200 dark:border-gray-600 
    dark:focus:ring-gray-400 dark:focus:border-gray-400
  `}
            onChange={(e) => {
              field.onChange(e.target.value as T[Path<T>]);
              onChange?.(e.target.value as T[Path<T>]);
            }}
          >
            {placeholder && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {fieldState?.error?.message && (
            <p className="text-red-500 text-sm mt-1">
              {fieldState.error.message}
            </p>
          )}
        </>
      );
    }

    if (as === "checkbox") {
      return (
        <>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={!!inputValue}
              disabled={readOnly || disabled}
              onChange={(e) => {
                const val = e.target.checked as T[Path<T>];
                field.onChange(val);
                onChange?.(val);
              }}
              className="w-4 h-4 rounded border-gray-300"
            />
            {label && <span>{label}</span>}
          </div>
          {fieldState?.error?.message && (
            <p className="text-red-500 text-sm mt-1">
              {fieldState.error.message}
            </p>
          )}
        </>
      );
    }

    // Default input (text or number)
    return (
      <>
        <input
          type={type}
          id={name}
          placeholder={placeholder}
          className={`${commonClasses} ${readOnly ? readOnlyClasses : ""} ${extraClass}`}
          readOnly={readOnly}
          disabled={disabled}
          value={inputValue as string | number}
          onChange={(e) => {
            let val: T[Path<T>];
            if (type === "number") {
              const raw = e.target.value;
              const stripped = raw.replace(/^0+(?=\d)/, "");
              const numericValue = stripped === "" ? 0 : Number(stripped);
              val = numericValue as T[Path<T>];
            } else {
              val = e.target.value as T[Path<T>];
            }
            field.onChange(val);
            onChange?.(val);
          }}
          // ✅ Auto-prevent scroll increment for numbers
          onWheel={(e) => {
            if (type === "number") e.currentTarget.blur();
          }}
        />
        {fieldState?.error?.message && (
          <p className="text-red-500 text-sm mt-1">
            {fieldState.error.message}
          </p>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col w-full scroll-mt-24" id={`field-${name}`}>
      {label && as !== "checkbox" && (
        <label htmlFor={name} className="text-sm font-semibold mb-1">
          {label} {required && <span className="text-red-500">*</span>}
          {tooltip && (
            <Tooltip title={tooltip} placement="top">
              <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer p-2" />
            </Tooltip>
          )}
        </label>
      )}
      {control ? (
        <Controller
          control={control}
          name={name}
          render={({ field, fieldState }) =>
            renderInput(field as FieldType, fieldState as FieldStateType)
          }
        />
      ) : (
        renderInput({ value, onChange } as FieldType)
      )}
    </div>
  );
};

export default FormField;
