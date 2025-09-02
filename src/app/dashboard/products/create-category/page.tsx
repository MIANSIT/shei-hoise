"use client";

import React, { useState, useEffect } from "react";
import { Button, message } from "antd";
import CategoryTable from "@/app/components/admin/dashboard/products/ProductCategory/CategoryTable";
import AddCategoryCardForm from "@/app/components/admin/dashboard/products/ProductCategory/CategoryForm";
import type { Category } from "@/lib/types/category";

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setCategories([
        { id: "1", name: "Electronics", description: "All electronic products", createdAt: "2025-09-02" },
        { id: "2", name: "Clothing", description: "Men and women clothing", createdAt: "2025-09-02" },
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
    message.success(`Deleted category ${category.name}`);
  };

  const handleFormSubmit = (data: { name: string; description?: string }) => {
    if (editingCategory) {
      setCategories(prev =>
        prev.map(c => (c.id === editingCategory.id ? { ...c, ...data } : c))
      );
      message.success("Category updated successfully!");
    } else {
      const newCategory: Category = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString().split("T")[0],
        ...data,
      };
      setCategories(prev => [...prev, newCategory]);
      message.success("Category created successfully!");
    }

    setShowForm(false);
    setEditingCategory(null);
  };

  return (
    <div className="p-6 space-y-4">
      {/* Top bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Categories</h2>
        <Button
          variant="solid"
          style={{
            backgroundColor: showForm ? "#dc2626" : "#16a34a", // red for close, green for create
            color: "white",
          }}
          onClick={() => {
            if (!showForm) setEditingCategory(null); // clear editing when opening create form
            setShowForm(prev => !prev);
          }}
        >
          {showForm ? "Close Form" : "Create Category"}
        </Button>
      </div>

      {/* Main content */}
      <div className={`flex gap-6 ${showForm ? "flex-row" : "flex-col"}`}>
        {/* Table */}
        <div className={`${showForm ? "w-2/3" : "w-full"}`}>
          <CategoryTable
            data={categories}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>

        {/* Form */}
        {showForm && (
          <div className="w-1/3">
            <AddCategoryCardForm
              onSubmit={handleFormSubmit}
              editingCategory={editingCategory}
              key={editingCategory?.id || "new-category"}
            />
          </div>
        )}
      </div>
    </div>
  );
}
