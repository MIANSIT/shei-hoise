// FormField.tsx
"use client";

import React from "react";
import { Controller, Control } from "react-hook-form";
import { Input, Select, Checkbox, InputNumber } from "antd";
import type { InputProps } from "antd/es/input";
import type { TextAreaProps } from "antd/es/input";
import type { SelectProps } from "antd/es/select";
import type { CheckboxProps } from "antd/es/checkbox";
import type { InputNumberProps } from "antd/es/input-number";

type Option = { label: string; value: string | number };

type BaseProps = {
  control: Control<any>;
  name: string;
  label?: string;
  required?: boolean;
  error?: string | null;
  readOnly?: boolean;
  placeholder?: string;
};

// Input (text/password/etc.)
type InputFieldProps = BaseProps & {
  as?: "input";
  type?: Exclude<InputProps["type"], undefined>;
} & Omit<InputProps, "name" | "value" | "onChange" | "defaultValue">;

// Textarea
type TextareaFieldProps = BaseProps & { as: "textarea" } & Omit<
    TextAreaProps,
    "name" | "value" | "onChange" | "defaultValue"
  >;

// Select
type SelectFieldProps = BaseProps & { as: "select"; options?: Option[] } & Omit<
    SelectProps<any>,
    "name" | "value" | "onChange" | "defaultValue"
  >;

// Checkbox
type CheckboxFieldProps = BaseProps & { as: "checkbox" } & Omit<
    CheckboxProps,
    "name" | "checked" | "onChange" | "defaultValue"
  >;

// Number (uses antd InputNumber)
type NumberFieldProps = BaseProps & { as?: "input"; type: "number" } & Omit<
    InputNumberProps,
    "name" | "value" | "onChange" | "defaultValue"
  >;

export type FormFieldProps =
  | InputFieldProps
  | TextareaFieldProps
  | SelectFieldProps
  | CheckboxFieldProps
  | NumberFieldProps;

const FormField: React.FC<FormFieldProps> = (props) => {
  const { control, name, label, required, error } = props as BaseProps;

  // render container + label
  return (
    <div className='flex flex-col w-full scroll-mt-24' id={`field-${name}`}>
      {label && (
        <label htmlFor={name} className='text-sm font-medium mb-1'>
          {label} {required && <span className='text-red-500'>*</span>}
        </label>
      )}

      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          // TEXTAREA
          if ((props as TextareaFieldProps).as === "textarea") {
            const p = props as TextareaFieldProps;
            return (
              <Input.TextArea
                id={name}
                {...(p as any)}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
                disabled={p.readOnly}
                status={error ? "error" : undefined}
              />
            );
          }

          // SELECT
          if ((props as SelectFieldProps).as === "select") {
            const p = props as SelectFieldProps;
            return (
              <Select
                id={name}
                {...(p as any)}
                value={field.value}
                onChange={(val) => field.onChange(val)}
                disabled={p.readOnly}
                options={p.options}
                status={error ? "error" : undefined}
              />
            );
          }

          // CHECKBOX
          if ((props as CheckboxFieldProps).as === "checkbox") {
            const p = props as CheckboxFieldProps;
            // Checkbox children often used as label — preserve that if provided
            const children = (p as any).children ?? p.placeholder ?? "";
            return (
              <Checkbox
                id={name}
                {...(p as any)}
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                disabled={p.readOnly}
              >
                {children}
              </Checkbox>
            );
          }

          // NUMBER (InputNumber)
          if ((props as NumberFieldProps).type === "number") {
            const p = props as NumberFieldProps;
            return (
              <InputNumber
                id={name}
                {...(p as any)}
                value={field.value ?? undefined}
                onChange={(val) => field.onChange(val)}
                disabled={p.readOnly}
                status={error ? "error" : undefined}
              />
            );
          }

          // DEFAULT INPUT (text/password/etc.)
          {
            const p = props as InputFieldProps;
            return (
              <Input
                id={name}
                {...(p as any)}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
                type={p.type}
                disabled={p.readOnly}
                status={error ? "error" : undefined}
              />
            );
          }
        }}
      />

      {error && <p className='text-red-400 text-sm mt-1'>{error}</p>}
    </div>
  );
};

export default FormField;
