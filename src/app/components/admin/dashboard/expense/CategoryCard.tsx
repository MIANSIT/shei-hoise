import React from "react";
import { ExpenseCategory } from "@/lib/types/expense/expense";

interface Props {
  category: ExpenseCategory;
}

export const CategoryCard: React.FC<Props> = ({ category }) => {
  return (
    <div
      className="flex flex-col items-center justify-center p-4 rounded-xl shadow-md transition hover:scale-105"
      style={{ backgroundColor: category.color || "#f3f3f3" }}
    >
      {category.icon && <span className="text-3xl">{category.icon}</span>}
      <h3 className="mt-2 font-semibold text-lg">{category.name}</h3>
      {category.description && (
        <p className="text-sm text-gray-600 text-center mt-1">
          {category.description}
        </p>
      )}
    </div>
  );
};
