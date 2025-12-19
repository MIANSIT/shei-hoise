"use client";

import { useState } from "react";
import { Button, Tag } from "antd";
import { FilterOutlined, CloseCircleOutlined } from "@ant-design/icons";

interface MobileFilterProps<T extends string> {
  value: T;
  defaultValue: T;
  options: T[];
  onChange: (value: T) => void;
  getLabel: (value: T) => string;
}

const MobileFilter = <T extends string>({
  value,
  defaultValue,
  options,
  onChange,
  getLabel,
}: MobileFilterProps<T>) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden w-full flex flex-col gap-2">
      {/* Filter button */}
      <Button
        icon={<FilterOutlined />}
        type={value === defaultValue ? "default" : "primary"}
        onClick={() => setOpen((prev) => !prev)}
        block
      >
        Filter
      </Button>

      {/* Active filter tag */}
      {value !== defaultValue && (
        <div className="w-full">
          <Tag
            color="blue"
            className="w-full px-4 py-3 text-base rounded-lg flex items-center justify-center relative shadow-sm min-h-[50px]"
          >
            {/* Label */}
            <span className="font-medium">{getLabel(value)}</span>

            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                onChange(defaultValue); // reset filter
                setOpen(false); // close dropdown
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-600 transition text-lg"
              aria-label="Remove filter"
            >
              <CloseCircleOutlined />
            </button>
          </Tag>
        </div>
      )}

      {/* Options panel */}
      {open && (
        <div className="flex flex-wrap gap-2 bg-gray-50 p-2 rounded shadow">
          {options.map((opt) => (
            <Button
              key={opt}
              size="small"
              type={value === opt ? "primary" : "default"}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {getLabel(opt)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileFilter;
