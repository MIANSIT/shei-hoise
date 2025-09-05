"use client";

import React from "react";
import CategoryTable from "@/app/components/admin/dashboard/products/ProductCategory/CategoryTable";
import type { Category } from "@/lib/types/category";

interface CategoryTablePanelProps {
  categories: Category[];
  loading: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  showForm: boolean;
}

export default function CategoryTablePanel({ categories, loading, onEdit, onDelete, showForm }: CategoryTablePanelProps) {
  return (
    <div className={`${showForm ? "w-2/3" : "w-full"}`}>
      <CategoryTable
        data={categories}
        loading={loading}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
