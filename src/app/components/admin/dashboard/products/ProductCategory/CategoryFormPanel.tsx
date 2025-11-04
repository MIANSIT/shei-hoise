"use client";

import React from "react";
import AddCategoryCardForm from "@/app/components/admin/dashboard/products/ProductCategory/CategoryForm";
import type { Category } from "@/lib/types/category";
import type { CreateCategoryType } from "@/lib/schema/category.schema";

interface CategoryFormPanelProps {
  showForm: boolean;
  editingCategory: Category | null;
  onSubmit: (data: CreateCategoryType) => void;
  allCategories: Category[];
}

export default function CategoryFormPanel({
  showForm,
  editingCategory,
  onSubmit,
  allCategories,
}: CategoryFormPanelProps) {
  if (!showForm) return null;

  return (
    <div className="">
      <AddCategoryCardForm
        onSubmit={onSubmit}
        editingCategory={editingCategory}
        key={editingCategory?.id || "new-category"}
        allCategories={allCategories}
      />
    </div>
  );
}
