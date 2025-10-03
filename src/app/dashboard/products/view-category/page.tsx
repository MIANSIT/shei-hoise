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

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import type { Category } from "@/lib/types/category";
import type { CreateCategoryType } from "@/lib/schema/category.schema";

// Type for raw API response
type RawCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parent_id?: string | null;
  is_active: boolean;
  created_at?: string;
};

// Hook to detect window width
function useWindowWidth() {
  const [width, setWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
}

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const notify = useSheiNotification();
  const { user, loading: userLoading } = useCurrentUser();

  const width = useWindowWidth();
  const isLgUp = width >= 1024; // Tailwind lg breakpoint

  // Fetch categories
  const fetchCategories = async () => {
    if (!user?.store_id) return;
    setLoading(true);
    try {
      const { data, error } = await getCategoriesQuery(user.store_id);
      if (error) throw error;

      setCategories(
        (data?.map((c: RawCategory) => ({
          ...c,
          createdAt: c.created_at
            ? new Date(c.created_at).toISOString().split("T")[0]
            : "",
        })) ?? []) as Category[]
      );
    } catch (err: unknown) {
      console.error("Error fetching categories:", err);
      if (err instanceof Error) {
        notify.error(err.message);
      } else {
        notify.error("Failed to load categories");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading) fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading]);

  // Edit category
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  // Delete category
  const handleDelete = async (category: Category) => {
    if (!user?.store_id) return;
    try {
      await deleteCategoryQuery(category.id, user.store_id);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      notify.info(`Deleted category "${category.name}"`);
    } catch (err: unknown) {
      console.error("Delete error:", err);
      if (err instanceof Error) {
        notify.error(err.message);
      } else {
        notify.error(`Failed to delete "${category.name}"`);
      }
    }
  };

  // Form submit
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
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        notify.error(err.message);
      } else {
        notify.error("Failed to save category");
      }
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Top Bar */}
      <CategoryTopBar
        showForm={showForm}
        toggleForm={() => {
          if (!showForm) setEditingCategory(null);
          setShowForm((prev) => !prev);
        }}
        isLgUp={isLgUp}
      />

      {/* Table + Inline Form for lg screens */}
      <div className={`flex gap-6 ${isLgUp ? "flex-row" : "flex-col"}`}>
        <CategoryTablePanel
          categories={categories}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showForm={showForm} // responsive width handled inside TablePanel
        />

        {isLgUp && showForm && (
          <div className="w-1/3">
            <CategoryFormPanel
              showForm={true}
              editingCategory={editingCategory}
              onSubmit={handleFormSubmit}
              allCategories={categories}
            />
          </div>
        )}
      </div>

      {/* Modal for md/sm */}
      {!isLgUp && showForm && (
        <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
          <DialogContent className="sm:max-w-lg w-full">
            <DialogTitle className="text-lg font-semibold mb-4">
              {editingCategory ? "Edit Category" : "Create Category"}
            </DialogTitle>
            <CategoryFormPanel
              showForm={true}
              editingCategory={editingCategory}
              onSubmit={handleFormSubmit}
              allCategories={categories}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
