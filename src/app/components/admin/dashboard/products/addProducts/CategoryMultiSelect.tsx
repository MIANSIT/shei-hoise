"use client";

import React from "react";
import { Select } from "antd";
import { Controller, Control, FieldPathByValue, FieldValues } from "react-hook-form";

const CREATE_NEW = "create_new";

interface CategoryMultiSelectProps<T extends FieldValues> {
  control: Control<T>;
  /** A `string[]` field — the first id is the main category. */
  name: FieldPathByValue<T, string[]>;
  categories: readonly { id: string; name: string }[];
  placeholder: string;
  /** Adds a "create new category" entry that opens the categories page. */
  createNewLabel?: string;
}

/**
 * Picks every category a product (or bundle) sits in. Order is kept as
 * chosen, so the first pick is the main category shown on cards and
 * breadcrumbs.
 */
export function CategoryMultiSelect<T extends FieldValues>({
  control,
  name,
  categories,
  placeholder,
  createNewLabel,
}: CategoryMultiSelectProps<T>) {
  const options = [
    ...categories.map((c) => ({ value: c.id, label: c.name })),
    ...(createNewLabel ? [{ value: CREATE_NEW, label: createNewLabel }] : []),
  ];

  return (
    <div className="flex w-full flex-col scroll-mt-24" id={`field-${name}`}>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => (
          <>
            <Select
              id={name}
              mode="multiple"
              value={(field.value as string[] | undefined) ?? []}
              onChange={(ids: string[]) => {
                if (ids.includes(CREATE_NEW)) {
                  window.location.href = "/dashboard/products/category";
                  return;
                }
                field.onChange(ids);
              }}
              onBlur={field.onBlur}
              placeholder={placeholder}
              options={options}
              showSearch={{ optionFilterProp: "label" }}
              status={fieldState.error ? "error" : undefined}
              aria-invalid={!!fieldState.error}
              className="w-full"
            />
            {fieldState.error?.message && (
              <p className="mt-1 text-xs text-rose-500">{fieldState.error.message}</p>
            )}
          </>
        )}
      />
    </div>
  );
}
