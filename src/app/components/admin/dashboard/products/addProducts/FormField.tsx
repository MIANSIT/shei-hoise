"use client";

import React from "react";
import { Controller, Control, FieldValues, Path } from "react-hook-form";

type Option = { label: string; value: string | number };

type BaseProps<T extends FieldValues> = {
  control?: Control<T>;
  value?: T[Path<T>];
  onChange?: (value: T[Path<T>]) => void;
  name: Path<T>;
  label?: string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  tooltip?: string;
  as?: "input" | "textarea" | "select" | "checkbox";
  type?: "text" | "email" | "password" | "number";
  options?: Option[];
};

export type FormFieldProps<T extends FieldValues> = BaseProps<T>;

// Shared input classes
const baseInput =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50";

const readOnlyInput =
  "bg-muted text-muted-foreground cursor-not-allowed focus:ring-0 focus:border-border";

const errorText = "mt-1 text-xs text-rose-500";

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
    tooltip: _tooltip, // consumed upstream, not used here
    as = "input",
    type = "text",
    options = [],
  } = props;

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
            rows={4}
            className={`${baseInput} resize-none ${className ?? ""}`}
            disabled={readOnly || disabled}
            value={inputValue as string}
            onChange={(e) => {
              field.onChange(e.target.value as T[Path<T>]);
              onChange?.(e.target.value as T[Path<T>]);
            }}
          />
          {fieldState?.error?.message && (
            <p className={errorText}>{fieldState.error.message}</p>
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
            className={`${baseInput} ${className ?? ""}`}
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
            <p className={errorText}>{fieldState.error.message}</p>
          )}
        </>
      );
    }

    if (as === "checkbox") {
      return (
        <>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!inputValue}
              disabled={readOnly || disabled}
              onChange={(e) => {
                const val = e.target.checked as T[Path<T>];
                field.onChange(val);
                onChange?.(val);
              }}
              className="h-4 w-4 rounded border-border text-emerald-500 focus:ring-emerald-500"
            />
            {label && <span className="text-sm text-foreground">{label}</span>}
          </div>
          {fieldState?.error?.message && (
            <p className={errorText}>{fieldState.error.message}</p>
          )}
        </>
      );
    }

    // Default input
    return (
      <>
        <input
          type={type}
          id={name}
          placeholder={placeholder}
          className={`${baseInput} ${readOnly ? readOnlyInput : ""} ${className ?? ""}`}
          readOnly={readOnly}
          disabled={disabled}
          value={inputValue as string | number}
          onChange={(e) => {
            let val: T[Path<T>];
            if (type === "number") {
              const raw = e.target.value;
              const stripped = raw.replace(/^0+(?=\d)/, "");
              val = (stripped === "" ? 0 : Number(stripped)) as T[Path<T>];
            } else {
              val = e.target.value as T[Path<T>];
            }
            field.onChange(val);
            onChange?.(val);
          }}
          onWheel={(e) => {
            if (type === "number") e.currentTarget.blur();
          }}
        />
        {fieldState?.error?.message && (
          <p className={errorText}>{fieldState.error.message}</p>
        )}
      </>
    );
  };

  return (
    <div className="flex w-full flex-col scroll-mt-24" id={`field-${name}`}>
      {label && as !== "checkbox" && (
        <label
          htmlFor={name}
          className="mb-1.5 text-sm font-medium text-foreground"
        >
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
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
