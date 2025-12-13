"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { createCategory } from "@/lib/queries/categories/createCategory";
import { updateCategory } from "@/lib/queries/categories/updateCategory";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories";
import { deleteCategoryQuery } from "@/lib/queries/categories/deleteCategory";

import CategoryTopBar from "@/app/components/admin/dashboard/products/ProductCategory/CategoryTopBar";
import CategoryTablePanel from "@/app/components/admin/dashboard/products/ProductCategory/CategoryTablePanel";
import CategoryFormPanel from "@/app/components/admin/dashboard/products/ProductCategory/CategoryFormPanel";
import CategoryCardList from "@/app/components/admin/dashboard/products/ProductCategory/CategoryCardList";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import type { Category } from "@/lib/types/category";
import type { CreateCategoryType } from "@/lib/schema/category.schema";
import { Pagination } from "antd";

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

  // Backend search & pagination
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const notify = useSheiNotification();
  const { user, loading: userLoading } = useCurrentUser();

  const width = useWindowWidth();
  const isLgUp = width >= 1024;

  // Fetch categories from backend
  const fetchCategories = useCallback(async () => {
    if (!user?.store_id) return;
    setLoading(true);

    try {
      const { data, count, error } = await getCategoriesQuery(user.store_id, {
        search: searchText,
        page,
        pageSize,
      });
      if (error) throw error;

      setCategories(
        (data?.map((c: RawCategory) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description ?? undefined,
          parent_id: c.parent_id ?? null,
          is_active: c.is_active,
          createdAt: c.created_at
            ? new Date(c.created_at).toISOString().split("T")[0]
            : "",
        })) ?? []) as Category[]
      );

      setTotal(count || 0);
    } catch (err: unknown) {
      console.error(err);
      notify.error(
        err instanceof Error ? err.message : "Failed to load categories"
      );
    } finally {
      setLoading(false);
    }
  }, [user?.store_id, searchText, page, pageSize, notify]);

  // refetch when user, search, page, pageSize changes
  useEffect(() => {
    if (!userLoading) {
      fetchCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, searchText, page, pageSize, user?.store_id]);

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
      fetchCategories(); // refetch after delete
      notify.info(`Deleted category "${category.name}"`);
    } catch (err: unknown) {
      console.error(err);
      notify.error(
        err instanceof Error ? err.message : "Failed to delete category"
      );
    }
  };

  // Toggle active status
  const handleToggleActive = async (category: Category, isActive: boolean) => {
    if (!user?.store_id) return;

    try {
      await updateCategory(
        {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description ?? null,
          parent_id: category.parent_id ?? null,
          is_active: isActive,
        },
        user.store_id
      );
      fetchCategories(); // refetch to update status
      notify.success(
        `Category "${category.name}" is now ${isActive ? "active" : "inactive"}`
      );
    } catch (err: unknown) {
      console.error(err);
      notify.error("Failed to update category status");
    }
  };

  // Form submit
  const handleFormSubmit = async (data: CreateCategoryType) => {
    if (!user?.store_id) return;

    const parent_id =
      data.parent_id === "" || data.parent_id === null ? null : data.parent_id;

    // 🔍 Normalize slug from form
    const slugToCheck = data.slug.toLowerCase().trim();

    // 🔥 Check if slug exists already in this store (exclude editing category)
    const exists = categories.some(
      (c) =>
        c.slug.toLowerCase() === slugToCheck && c.id !== editingCategory?.id
    );

    if (exists) {
      notify.error(`Category with slug "${data.slug}" already exists.`);
      return;
    }

    try {
      if (editingCategory) {
        // Update
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
        // Create
        await createCategory(
          { ...data, parent_id, is_active: data.is_active ?? true },
          user.store_id
        );
        notify.success(`Category "${data.name}" created successfully!`);
      }

      setShowForm(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (err: unknown) {
      console.error(err);
      notify.error(
        err instanceof Error ? err.message : "Failed to save category"
      );
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
        searchText={searchText}
        setSearchText={(text) => {
          setSearchText(text);
          setPage(1); // reset page when searching
        }}
      />

      <div className={`flex gap-6 ${isLgUp ? "flex-row" : "flex-col"}`}>
        {/* Desktop Table */}
        {isLgUp ? (
          <CategoryTablePanel
            categories={categories}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            showForm={showForm}
          />
        ) : (
          <CategoryCardList
            categories={categories}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        )}

        {/* Inline Form for lg */}
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

      {/* Pagination */}
      <div className="flex justify-end">
        <Pagination
          current={page}
          pageSize={pageSize}
          total={total} // total items from backend
          showSizeChanger
          pageSizeOptions={["5", "10", "20", "50", "100"]}
          onChange={(p, size) => {
            setPage(p);
            setPageSize(size);
          }}
        />
      </div>

      {/* Modal for mobile */}
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
