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
    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
      <div className="relative flex-1 sm:w-64">
        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          suffix={
            search ? (
              <CloseCircleFilled
                onClick={() => onSearchChange("")}
                className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors"
              />
            ) : null
          }
          placeholder="Search categories..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="rounded-xl h-9"
        />
      </div>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={onNewCategory}
        className="font-semibold rounded-xl h-9"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "none",
          boxShadow: "0 4px 14px rgba(102,126,234,0.4)",
          fontWeight: 600,
          paddingInline: "16px",
        }}
      >
        New Category
      </Button>
    </div>
  );
}
