"use client";

import { Empty } from "antd";
import { ExpenseCategory } from "@/lib/types/expense/expense";
import { CategoryCard } from "./CategoryCard";

interface CategoryGridProps {
  categories: ExpenseCategory[];
  onEdit: (cat: ExpenseCategory) => void;
  onDelete: (cat: ExpenseCategory) => void;
}

export function CategoryGrid({ categories, onEdit, onDelete }: CategoryGridProps) {
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-32 text-center">
        <div className="w-20 h-20 rounded-2xl bg-input flex items-center justify-center mb-4 text-3xl">
          📂
        </div>
        <p className="text-primary font-medium text-sm">No categories found</p>
        <p className="text-ring text-xs mt-1">
          Create your first category to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
      {categories.map((cat) => (
        <CategoryCard key={cat.id} cat={cat} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}