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
        <div className="flex justify-center relative">
          <Tag
            color="white"
            className="relative flex items-center justify-center px-6 py-2 text-base rounded-lg shadow-sm text-black!"
          >
            <span className="text-lg text-left pr-2">{getLabel(value)}</span>

            {/* Cross icon absolutely positioned top-right */}
            <CloseCircleOutlined
              onClick={() => {
                onChange(defaultValue);
                setOpen(false);
              }}
              className="absolute -top-2 -right-2 text-red-500! cursor-pointer text-lg"
            />
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
