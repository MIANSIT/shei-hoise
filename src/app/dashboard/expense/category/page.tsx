"use client";

import React, { useEffect, useState } from "react";
import { ExpenseCategory } from "@/lib/types/expense/expense";
import { getCategories } from "@/lib/queries/expense/getCategories";
import { CategoryCard } from "@/app/components/admin/dashboard/expense/CategoryCard";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const { storeId, loading: userLoading } = useCurrentUser();

  useEffect(() => {
    if (!storeId) return;

    setLoading(true);

    getCategories(storeId)
      .then((data) => {
        if (data) setCategories(data);
      })
      .finally(() => setLoading(false));
  }, [storeId]);

  if (loading || userLoading) return <p className="p-4">Loading categories...</p>;

  if (!categories.length)
    return (
      <p className="p-4 text-center text-gray-500">
        No categories found for this store.
      </p>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {categories.map((cat) => (
        <CategoryCard key={cat.id} category={cat} />
      ))}
    </div>
  );
};

export default CategoriesPage;
