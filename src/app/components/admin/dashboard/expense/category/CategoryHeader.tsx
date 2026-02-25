"use client";

import { Input, Button } from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  CloseCircleFilled,
} from "@ant-design/icons";

interface CategoryHeaderProps {
  search: string;
  onSearchChange: (val: string) => void;
  onNewCategory: () => void;
}

export function CategoryHeader({
  search,
  onSearchChange,
  onNewCategory,
}: CategoryHeaderProps) {
  return (
    <div className="mb-10">
      {/* Title */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ring mb-1">
          Expense Management
        </p>
        <h1 className="text-4xl font-black text-primary tracking-tight leading-none">
          Categories
        </h1>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            prefix={<SearchOutlined className="text-ring" />}
            suffix={
              search ? (
                <CloseCircleFilled
                  onClick={() => onSearchChange("")}
                  className="text-ring cursor-pointer hover:text-primary transition-colors"
                />
              ) : null
            }
            placeholder="Search categories..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="rounded-xl border-ring bg-background shadow-sm h-10"
            style={{ fontFamily: "inherit" }}
          />
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onNewCategory}
          style={{
            border: "none",
            borderRadius: "12px",
            height: "40px",
            fontWeight: 600,
            fontFamily: "inherit",
            letterSpacing: "0.02em",
            paddingInline: "20px",
          }}
        >
          New Category
        </Button>
      </div>
    </div>
  );
}
