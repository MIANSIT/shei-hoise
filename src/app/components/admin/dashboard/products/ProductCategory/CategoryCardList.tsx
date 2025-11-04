"use client";

import React from "react";
import ProductCardLayout from "@/app/components/admin/common/ProductCardLayout";
import { Button, Tooltip, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { Category } from "@/lib/types/category";

interface CategoryCardListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

const CategoryCardList: React.FC<CategoryCardListProps> = ({
  categories,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {categories.map((category) => (
        <ProductCardLayout
          key={category.id}
          title={category.name}
          subtitle={`Created At: ${category.createdAt}`}
          content={category.description ? <p>{category.description}</p> : null}
          actions={
            <div className="flex gap-2">
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
