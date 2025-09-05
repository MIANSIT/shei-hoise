"use client";

import React, { useState, useEffect } from "react";
import type { Category } from "@/lib/types/category";
import CategoryTopBar from "@/app/components/admin/dashboard/products/ProductCategory/CategoryTopBar";
import CategoryFormPanel from "@/app/components/admin/dashboard/products/ProductCategory/CategoryFormPanel";
import CategoryTablePanel from "@/app/components/admin/dashboard/products/ProductCategory/CategoryTablePanel";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const notify = useSheiNotification();

  // Fetch categories (simulated)
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setCategories([
        {
          id: "1",
          name: "Electronics",
          description: "All electronic products",
          createdAt: "2025-09-02",
        },
        {
          id: "2",
          name: "Clothing",
          description: "Men and women clothing",
          createdAt: "2025-09-02",
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDelete = (category: Category) => {
    setCategories(prev => prev.filter(c => c.id !== category.id));
    notify.error(`Deleted category "${category.name}"`); // RED for delete
  };

  const handleFormSubmit = (data: { name: string; description?: string }) => {
    if (editingCategory) {
      setCategories(prev =>
        prev.map(c => (c.id === editingCategory.id ? { ...c, ...data } : c))
      );
      notify.info(`Category "${data.name}" updated successfully!`); // BLUE for update
    } else {
      const newCategory: Category = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString().split("T")[0],
        ...data,
      };
      setCategories(prev => [...prev, newCategory]);
      notify.success(`Category "${data.name}" created successfully!`); // GREEN for create
    }

    setShowForm(false);
    setEditingCategory(null);
  };

  return (
    <div className="p-6 space-y-4">
      <CategoryTopBar
        showForm={showForm}
        toggleForm={() => {
          if (!showForm) setEditingCategory(null);
          setShowForm(prev => !prev);
        }}
      />

      <div className={`flex gap-6 ${showForm ? "flex-row" : "flex-col"}`}>
        <CategoryTablePanel
          categories={categories}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showForm={showForm}
        />

        <CategoryFormPanel
          showForm={showForm}
          editingCategory={editingCategory}
          onSubmit={handleFormSubmit}
        />
      </div>
    </div>
  );
}
