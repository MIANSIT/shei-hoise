"use client";

import React from "react";
import AddCategoryCardForm from "@/app/components/admin/dashboard/products/ProductCategory/CategoryForm";
import type { Category } from "@/lib/types/category";

interface CategoryFormPanelProps {
  showForm: boolean;
  editingCategory: Category | null;
  onSubmit: (data: { name: string; description?: string }) => void;
}

export default function CategoryFormPanel({ showForm, editingCategory, onSubmit }: CategoryFormPanelProps) {
  if (!showForm) return null;

  return (
    <div className="w-1/3">
      <AddCategoryCardForm
        onSubmit={onSubmit}
        editingCategory={editingCategory}
        key={editingCategory?.id || "new-category"}
      />
    </div>
  );
}
