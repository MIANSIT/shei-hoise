/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { createCategory } from "@/lib/queries/categories/createCategory";
import { updateCategory } from "@/lib/queries/categories/updateCategory";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories";
import { deleteCategoryQuery } from "@/lib/queries/categories/deleteCategory";

import CategoryTopBar from "@/app/components/admin/dashboard/products/ProductCategory/CategoryTopBar";
import CategoryTablePanel from "@/app/components/admin/dashboard/products/ProductCategory/CategoryTablePanel";
import CategoryFormPanel from "@/app/components/admin/dashboard/products/ProductCategory/CategoryFormPanel";

import type { Category } from "@/lib/types/category";
import type { CreateCategoryType } from "@/lib/schema/category.schema";

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const notify = useSheiNotification();
  const { user, loading: userLoading } = useCurrentUser();

  const fetchCategories = async () => {
    if (!user?.store_id) return;
    setLoading(true);
    try {
      const { data, error } = await getCategoriesQuery(user.store_id);
      if (error) throw error;
      setCategories(
        (data?.map((c: any) => ({
          ...c,
          createdAt: c.created_at
            ? new Date(c.created_at).toISOString().split("T")[0]
            : "",
        })) ?? []) as Category[]
      );
    } catch (err) {
      console.error("Error fetching categories:", err);
      notify.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading) fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading]);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDelete = async (category: Category) => {
    if (!user?.store_id) return;
    try {
      await deleteCategoryQuery(category.id, user.store_id);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      notify.info(`Deleted category "${category.name}"`);
    } catch (error) {
      console.error("Delete error:", error);
      notify.error(`Failed to delete "${category.name}"`);
    }
  };

  const handleFormSubmit = async (data: CreateCategoryType) => {
    if (!user?.store_id) {
      notify.error("Missing store info");
      return;
    }

    const parent_id =
      data.parent_id === "" ||
      data.parent_id === null ||
      data.parent_id === undefined
        ? null
        : data.parent_id;

    try {
      if (editingCategory) {
        await updateCategory(
          {
            id: editingCategory.id,
            name: data.name,
            slug: data.slug,
            description: data.description ?? null,
            parent_id,
            is_active: data.is_active ?? true,
          },
          user.store_id
        );
        notify.info(`Category "${data.name}" updated successfully!`);
      } else {
        await createCategory(
          {
            ...data,
            parent_id,
            is_active: data.is_active ?? true,
          },
          user.store_id
        );
        notify.success(`Category "${data.name}" created successfully!`);
      }

      setShowForm(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (err: any) {
      console.error(err);
      notify.error(err?.message ?? "Failed to save category");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <CategoryTopBar
        showForm={showForm}
        toggleForm={() => {
          if (!showForm) setEditingCategory(null);
          setShowForm((prev) => !prev);
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
          allCategories={categories}
        />
      </div>
    </div>
  );
}
