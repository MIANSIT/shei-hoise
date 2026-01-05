"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { createCategory } from "@/lib/queries/categories/createCategory";
import { updateCategory } from "@/lib/queries/categories/updateCategory";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories";
import { deleteCategoryQuery } from "@/lib/queries/categories/deleteCategory";
import { useUrlSync, parseInteger } from "@/lib/hook/filterWithUrl/useUrlSync";
import CategoryTopBar from "@/app/components/admin/dashboard/products/ProductCategory/CategoryTopBar";
import CategoryTablePanel from "@/app/components/admin/dashboard/products/ProductCategory/CategoryTablePanel";
import CategoryFormPanel from "@/app/components/admin/dashboard/products/ProductCategory/CategoryFormPanel";
import CategoryCardList from "@/app/components/admin/dashboard/products/ProductCategory/CategoryCardList";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button, Pagination } from "antd";

import type { Category } from "@/lib/types/category";
import type { CreateCategoryType } from "@/lib/schema/category.schema";

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
  const [total, setTotal] = useState(0);

  // URL-based search & pagination using your custom hook
  const [searchText, setSearchText] = useUrlSync<string>(
    "search",
    "",
    undefined,
    500
  );
  const [page, setPage] = useUrlSync<number>("page", 1, parseInteger);
  const [pageSize, setPageSize] = useUrlSync<number>(
    "pageSize",
    10,
    parseInteger
  );

  const [statusFilter, setStatusFilter] = useUrlSync<boolean | null>(
    "status",
    null,
    (value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      return null;
    }
  );

  const notify = useSheiNotification();
  const { user, loading: userLoading } = useCurrentUser();
  const width = useWindowWidth();
  const isLgUp = width >= 1024;

  // Create a ref to track the latest dependencies
  const fetchDependenciesRef = useRef({
    userStoreId: user?.store_id,
    searchText,
    page,
    pageSize,
    statusFilter,
  });

  // Update ref when dependencies change
  useEffect(() => {
    fetchDependenciesRef.current = {
      userStoreId: user?.store_id,
      searchText,
      page,
      pageSize,
      statusFilter,
    };
  }, [user?.store_id, searchText, page, pageSize, statusFilter]);

  // Fetch categories function - stable reference
  const fetchCategories = useCallback(async () => {
    const { userStoreId, searchText, page, pageSize, statusFilter } =
      fetchDependenciesRef.current;

    if (!userStoreId) return;

    setLoading(true);

    try {
      const { data, count, error } = await getCategoriesQuery(userStoreId, {
        search: searchText,
        page,
        pageSize,
        status: statusFilter,
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
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleStatusFilter = useCallback(
    (status: boolean | null) => {
      setStatusFilter(status);
      setPage(1); // Reset to first page when filtering
    },
    [setStatusFilter, setPage]
  );

  // Trigger fetch when dependencies change
  useEffect(() => {
    if (!userLoading && user?.store_id) {
      fetchCategories();
    }
  }, [
    userLoading,
    user?.store_id,
    searchText,
    page,
    pageSize,
    statusFilter, // This is CRITICAL - add statusFilter to dependencies
    fetchCategories,
  ]);

  // Handle immediate search
  const handleSearchSubmit = useCallback(
    (text: string) => {
      setSearchText(text);
      setPage(1);
    },
    [setSearchText, setPage]
  );

  // Edit category
  const handleEdit = useCallback((category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  }, []);

  // Delete category
  const handleDelete = useCallback(
    async (category: Category) => {
      if (!user?.store_id) return;
      try {
        await deleteCategoryQuery(category.id, user.store_id);
        fetchCategories(); // refetch after delete
        notify.info(`Deleted category "${category.name}"`);
      } catch (err: unknown) {
        console.error("Failed to delete category:", err);
        notify.error(
          err instanceof Error ? err.message : "Failed to delete category"
        );
      }
    },
    [user?.store_id, fetchCategories, notify]
  );

  // Toggle active status
  const handleToggleActive = useCallback(
    async (category: Category, isActive: boolean) => {
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
        if (isActive) {
          notify.success(`Category "${category.name}" is now active`);
        } else {
          notify.error(`Category "${category.name}" is now inactive`);
        }
      } catch (err: unknown) {
        console.error("Failed to toggle category status:", err);
        notify.error("Failed to update category status");
      }
    },
    [user?.store_id, fetchCategories, notify]
  );

  // Form submit
  const handleFormSubmit = useCallback(
    async (data: CreateCategoryType) => {
      if (!user?.store_id) return;

      const parent_id =
        data.parent_id === "" || data.parent_id === null
          ? null
          : data.parent_id;

      // Normalize slug from form
      const slugToCheck = data.slug.toLowerCase().trim();

      // Check if slug exists already in this store (exclude editing category)
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
        console.error("Failed to save category:", err);
        notify.error(
          err instanceof Error ? err.message : "Failed to save category"
        );
      }
    },
    [user?.store_id, categories, editingCategory, fetchCategories, notify]
  );

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (newPage: number, newPageSize: number) => {
      setPage(newPage);
      setPageSize(newPageSize);
    },
    [setPage, setPageSize]
  );

  // Toggle form
  const toggleForm = useCallback(() => {
    if (!showForm) setEditingCategory(null);
    setShowForm((prev) => !prev);
  }, [showForm]);

  return (
    <div className="p-6 space-y-4">
      {/* Top Bar */}
      <CategoryTopBar
        showForm={showForm}
        toggleForm={toggleForm}
        isLgUp={isLgUp}
        searchText={searchText}
        onSearchSubmit={handleSearchSubmit}
        statusFilter={statusFilter}
        onStatusFilter={handleStatusFilter}
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
      {/* Pagination */}
      <div className="mt-4">
        {/* Mobile Pagination */}
        {!isLgUp && (
          <div className="flex flex-col items-center gap-2">
            {/* Total items */}
            <div className="text-sm text-gray-600">
              {`${Math.min((page - 1) * pageSize + 1, total)}-${Math.min(
                page * pageSize,
                total
              )} of ${total} items`}
            </div>

            {/* Previous / Next */}
            <div className="flex gap-2">
              <div className="flex items-center gap-2">
                <Button
                  className="px-2 py-0.5 text-xs bg-gray-200 rounded disabled:opacity-50"
                  disabled={page === 1}
                  onClick={() => handlePaginationChange(page - 1, pageSize)}
                >
                  ← Previous
                </Button>

                <span className="text-sm">
                  {page} of {Math.ceil(total / pageSize) || 1}
                </span>

                <Button
                  className="px-2 py-0.5 text-xs bg-gray-200 rounded disabled:opacity-50"
                  disabled={page >= Math.ceil(total / pageSize)}
                  onClick={() => handlePaginationChange(page + 1, pageSize)}
                >
                  Next →
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Pagination */}
        {isLgUp && (
          <div className="flex justify-end">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              showSizeChanger
              pageSizeOptions={["10", "20", "50", "100"]}
              onChange={handlePaginationChange}
              showTotal={(total, range) =>
                `${range[0]}-${range[1]} of ${total} items`
              }
            />
          </div>
        )}
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
