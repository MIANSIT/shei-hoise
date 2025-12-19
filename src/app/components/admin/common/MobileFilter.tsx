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
    <div className="md:hidden w-full flex flex-col gap-3">
      {/* Filter button */}
      <Button
        icon={<FilterOutlined />}
        type={value === defaultValue ? "default" : "primary"}
        onClick={() => setOpen(true)}
        block
        className="rounded-lg shadow-md"
      >
        Filter
      </Button>

      {/* Active filter tag */}
      {value !== defaultValue && (
        <div className="flex justify-center relative">
          <Tag
           color="green"
            className="relative flex items-center justify-center px-6 py-2 text-base rounded-lg shadow-md border border-green-200 "
          >
            <span className="text-lg text-center pr-2">{getLabel(value)}</span>
            <CloseCircleOutlined
              onClick={() => onChange(defaultValue)}
              className="absolute -top-2 -right-2 text-red-500! cursor-pointer text-lg"
            />
          </Tag>
        </div>
      )}

      {/* Mobile bottom sheet */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-center items-end bg-black/30"
          onClick={() => setOpen(false)}
        >
          {/* Sheet container */}
          <div
            className="bg-white w-full rounded-t-2xl shadow-lg animate-slide-up"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
            <h3 className="text-xl font-semibold p-4 text-center border-b border-gray-200">
              Filter Options
            </h3>

            <div className="flex flex-col divide-y divide-gray-100">
              {options.map((opt) => {
                const selected = value === opt;
                return (
                  <button
                    key={opt}
                    className={`w-full flex items-center px-6 py-4 text-lg text-left transition-colors ${
                      selected
                        ? "bg-blue-50 text-blue-600 font-semibold"
                        : "text-gray-800 hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                  >
                    {/* Custom radio */}
                    <span
                      className={`w-5 h-5 mr-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        selected
                          ? "border-blue-600 bg-blue-600"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {selected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-white" />
                      )}
                    </span>
                    {getLabel(opt)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default MobileFilter;
