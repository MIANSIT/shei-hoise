"use client";

import React from "react";
import ProductCardLayout from "@/app/components/admin/common/ProductCardLayout";
import { Button, Tooltip, Popconfirm, Switch } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { Category } from "@/lib/types/category";

interface CategoryCardListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onToggleActive: (category: Category, isActive: boolean) => void; // ✅ new prop
}

const CategoryCardList: React.FC<CategoryCardListProps> = ({
  categories,
  onEdit,
  onDelete,
  onToggleActive, // ✅ destructure
}) => {
  return (
    <div className="flex flex-col gap-4">
      {categories.map((category) => (
        <ProductCardLayout
          key={category.id}
          title={category.name}
          subtitle={`Created At: ${category.createdAt}`}
          content={
            <div className="flex justify-between items-center">
              {/* Left side: description */}
              <div className="flex-1">
                {category.description && <p>{category.description}</p>}
              </div>

              {/* Right side: toggle switch */}
              <div className="ml-4">
                <Switch
                  checked={category.is_active}
                  onChange={(checked) => onToggleActive(category, checked)}
                  style={{
                    backgroundColor: category.is_active ? "#22c55e" : "#ef4444",
                  }}
                />
              </div>
            </div>
          }
          actions={
            <div className="flex gap-2 items-center">
              <Tooltip title="Edit">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(category)}
                />
              </Tooltip>

              <Popconfirm
                title="Are you sure to delete this category?"
                onConfirm={() => onDelete(category)}
                okText="Yes"
                cancelText="No"
              >
                <Tooltip title="Delete">
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
            </div>
          }
        />
      ))}
    </div>
  );
};

export default CategoryCardList;
