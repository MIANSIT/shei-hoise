/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import type { CreateCategoryType } from "@/lib/schema/category.schema";
import type { Category } from "@/lib/types/category";
import CategoryTopBar from "@/app/components/admin/dashboard/products/ProductCategory/CategoryTopBar";
import CategoryFormPanel from "@/app/components/admin/dashboard/products/ProductCategory/CategoryFormPanel";
import CategoryTablePanel from "@/app/components/admin/dashboard/products/ProductCategory/CategoryTablePanel";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { supabase } from "@/lib/supabase";

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const notify = useSheiNotification();

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, description, parent_id, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching categories:", error);
      notify.error("Failed to load categories");
    } else {
      const mapped: Category[] =
        (data?.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug ?? "",
          description: c.description ?? "",
          parent_id: c.parent_id ?? null,
          is_active: c.is_active ?? true,
          createdAt: c.created_at ? new Date(c.created_at).toISOString().split("T")[0] : "",
        })) ?? []) as Category[];
      setCategories(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDelete = async (category: Category) => {
    const { error } = await supabase.from("categories").delete().eq("id", category.id);

    if (error) {
      notify.error(`Failed to delete "${category.name}"`);
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== category.id));
    notify.error(`Deleted category "${category.name}"`);
  };

  // <-- unified type here: CreateCategoryType
  const handleFormSubmit = async (data: CreateCategoryType) => {
    // normalize parent_id (empty string -> null)
    const parent_id = data.parent_id === "" || data.parent_id === null || data.parent_id === undefined
      ? null
      : data.parent_id;

    if (editingCategory) {
      const { error } = await supabase
        .from("categories")
        .update({
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          parent_id,
          is_active: data.is_active ?? true,
          edited_at: new Date().toISOString(),
        })
        .eq("id", editingCategory.id);

      if (error) {
        notify.error("Update failed");
        return;
      }
      notify.info(`Category "${data.name}" updated successfully!`);
    } else {
      const { error } = await supabase.from("categories").insert({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        parent_id,
        is_active: data.is_active ?? true,
      });

      if (error) {
        notify.error("Create failed");
        return;
      }
      notify.success(`Category "${data.name}" created successfully!`);
    }

    setShowForm(false);
    setEditingCategory(null);
    fetchCategories(); // refresh table
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
