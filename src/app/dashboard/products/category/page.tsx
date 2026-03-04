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
import { Pagination } from "antd";

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

// Only used for the Dialog breakpoint decision
function useWindowWidth() {
  const [width, setWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1280,
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

  const [searchText, setSearchText] = useUrlSync<string>(
    "search",
    "",
    undefined,
    500,
  );
  const [page, setPage] = useUrlSync<number>("page", 1, parseInteger);
  const [pageSize, setPageSize] = useUrlSync<number>(
    "pageSize",
    10,
    parseInteger,
  );
  const [statusFilter, setStatusFilter] = useUrlSync<boolean | null>(
    "status",
    null,
    (value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      return null;
    },
  );

  const notify = useSheiNotification();
  const { user, loading: userLoading } = useCurrentUser();
  const width = useWindowWidth();
  const isLgUp = width >= 1024;

  const fetchDependenciesRef = useRef({
    userStoreId: user?.store_id,
    searchText,
    page,
    pageSize,
    statusFilter,
  });

  useEffect(() => {
    fetchDependenciesRef.current = {
      userStoreId: user?.store_id,
      searchText,
      page,
      pageSize,
      statusFilter,
    };
  }, [user?.store_id, searchText, page, pageSize, statusFilter]);

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
        })) ?? []) as Category[],
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
      setPage(1);
    },
    [setStatusFilter, setPage],
  );

  useEffect(() => {
    if (!userLoading && user?.store_id) fetchCategories();
  }, [
    userLoading,
    user?.store_id,
    searchText,
    page,
    pageSize,
    statusFilter,
    fetchCategories,
  ]);

  const handleSearchSubmit = useCallback(
    (text: string) => {
      setSearchText(text);
      setPage(1);
    },
    [setSearchText, setPage],
  );

  const handleEdit = useCallback((category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (category: Category) => {
      if (!user?.store_id) return;
      try {
        await deleteCategoryQuery(category.id, user.store_id);
        fetchCategories();
        notify.info(`Deleted category "${category.name}"`);
      } catch (err: unknown) {
        notify.error(
          err instanceof Error ? err.message : "Failed to delete category",
        );
      }
    },
    [user?.store_id, fetchCategories, notify],
  );

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
          user.store_id,
        );
        fetchCategories();
        if (isActive) {
          notify.success(`"${category.name}" is now active`);
        } else {
          notify.error(`"${category.name}" is now inactive`);
        }
      } catch {
        notify.error("Failed to update category status");
      }
    },
    [user?.store_id, fetchCategories, notify],
  );

  const handleFormSubmit = useCallback(
    async (data: CreateCategoryType) => {
      if (!user?.store_id) return;
      const parent_id =
        data.parent_id === "" || data.parent_id === null
          ? null
          : data.parent_id;
      const slugToCheck = data.slug.toLowerCase().trim();
      const exists = categories.some(
        (c) =>
          c.slug.toLowerCase() === slugToCheck && c.id !== editingCategory?.id,
      );
      if (exists) {
        notify.error(`Slug "${data.slug}" already exists.`);
        return;
      }
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
            user.store_id,
          );
          notify.info(`"${data.name}" updated successfully!`);
        } else {
          await createCategory(
            { ...data, parent_id, is_active: data.is_active ?? true },
            user.store_id,
          );
          notify.success(`"${data.name}" created successfully!`);
        }
        setShowForm(false);
        setEditingCategory(null);
        fetchCategories();
      } catch (err: unknown) {
        notify.error(
          err instanceof Error ? err.message : "Failed to save category",
        );
      }
    },
    [user?.store_id, categories, editingCategory, fetchCategories, notify],
  );

  const handlePaginationChange = useCallback(
    (newPage: number, newPageSize: number) => {
      setPage(newPage);
      setPageSize(newPageSize);
    },
    [setPage, setPageSize],
  );

  const toggleForm = useCallback(() => {
    if (!showForm) setEditingCategory(null);
    setShowForm((prev) => !prev);
  }, [showForm]);

  const activeCount = categories.filter((c) => c.is_active).length;
  const inactiveCount = categories.filter((c) => !c.is_active).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117] transition-colors duration-300">
      <div
        className="w-full max-w-screen-2xl mx-auto
                      px-3 sm:px-5 md:px-6 lg:px-8
                      py-4 sm:py-6
                      space-y-4 sm:space-y-5"
      >
        {/* ── Page Header ─────────────────────────────── */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-indigo-500 mb-0.5">
              Product Management
            </p>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Categories
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              {total} total &middot; {activeCount} active &middot;{" "}
              {inactiveCount} inactive
            </p>
          </div>
        </div>

        {/* ── Stats Row ────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            {
              label: "Total",
              value: total,
              color: "text-indigo-500",
              bg: "bg-indigo-500/10",
            },
            {
              label: "Active",
              value: activeCount,
              color: "text-emerald-500",
              bg: "bg-emerald-500/10",
            },
            {
              label: "Inactive",
              value: inactiveCount,
              color: "text-amber-500",
              bg: "bg-amber-500/10",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white dark:bg-[#16181f] border border-gray-200 dark:border-[#2a2d3a]
                         rounded-xl p-2.5 sm:p-3 md:p-4
                         flex flex-col sm:flex-row items-center gap-1 sm:gap-3"
            >
              {/* Count bubble */}
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg shrink-0 ${s.bg} flex items-center justify-center`}
              >
                <span className={`text-sm sm:text-base font-bold ${s.color}`}>
                  {s.value}
                </span>
              </div>
              {/* Label — always visible at every breakpoint */}
              <div className="min-w-0 text-center sm:text-left">
                <p
                  className={`text-[11px] sm:text-xs font-semibold ${s.color}`}
                >
                  {s.label}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">
                  Categories
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Top Bar ──────────────────────────────────── */}
        <CategoryTopBar
          showForm={showForm}
          toggleForm={toggleForm}
          searchText={searchText}
          onSearchSubmit={handleSearchSubmit}
          statusFilter={statusFilter}
          onStatusFilter={handleStatusFilter}
        />

        {/* ── Content: Cards (mobile/tablet) + Table+Form (desktop) ── */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Card list — shown below lg */}
          <div className="w-full lg:hidden">
            <CategoryCardList
              categories={categories}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          </div>

          {/* Table panel — shown lg+ */}
          <div className="hidden lg:block min-w-0 flex-1">
            <CategoryTablePanel
              categories={categories}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              showForm={showForm}
            />
          </div>

          {/* Inline form — lg+ only, next to table */}
          {showForm && (
            <div className="hidden lg:block w-80 xl:w-96 shrink-0">
              <CategoryFormPanel
                showForm={true}
                editingCategory={editingCategory}
                onSubmit={handleFormSubmit}
                allCategories={categories}
              />
            </div>
          )}
        </div>

        {/* ── Pagination ───────────────────────────────── */}
        {/* Mobile/tablet */}
        <div className="flex flex-col items-center gap-2 lg:hidden">
          <p className="text-xs text-gray-400 tabular-nums">
            {`${Math.min((page - 1) * pageSize + 1, total)}–${Math.min(page * pageSize, total)} of ${total}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => handlePaginationChange(page - 1, pageSize)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200
                         dark:border-[#2a2d3a] bg-white dark:bg-[#16181f]
                         text-gray-600 dark:text-gray-300
                         disabled:opacity-40 disabled:cursor-not-allowed
                         hover:bg-gray-50 dark:hover:bg-[#1c1f2b] transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 tabular-nums">
              {page} / {Math.ceil(total / pageSize) || 1}
            </span>
            <button
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => handlePaginationChange(page + 1, pageSize)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200
                         dark:border-[#2a2d3a] bg-white dark:bg-[#16181f]
                         text-gray-600 dark:text-gray-300
                         disabled:opacity-40 disabled:cursor-not-allowed
                         hover:bg-gray-50 dark:hover:bg-[#1c1f2b] transition-colors"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden lg:flex justify-end">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger
            pageSizeOptions={["10", "20", "50", "100"]}
            onChange={handlePaginationChange}
            showTotal={(total, range) =>
              `${range[0]}–${range[1]} of ${total} items`
            }
          />
        </div>
      </div>

      {/* ── Mobile / Tablet: Form in Dialog ──────────── */}
      {!isLgUp && showForm && (
        <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
          <DialogContent
            className="w-[calc(100vw-24px)] sm:w-120 max-h-[90dvh]
                       overflow-y-auto rounded-2xl p-0 border-0 shadow-2xl"
          >
            {/* Custom header with explicit close button */}
            <div
              className="sticky top-0 z-10 bg-white dark:bg-[#16181f]
                            px-5 py-4 border-b border-gray-100 dark:border-[#2a2d3a]
                            flex items-center justify-between"
            >
              <DialogTitle className="text-base font-bold text-gray-900 dark:text-white">
                {editingCategory ? "Edit Category" : "Create Category"}
              </DialogTitle>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg
                           border border-gray-200 dark:border-[#2a2d3a]
                           text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
                           hover:bg-gray-100 dark:hover:bg-[#2a2d3a]
                           transition-all duration-150"
                aria-label="Close"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <CategoryFormPanel
                showForm={true}
                editingCategory={editingCategory}
                onSubmit={handleFormSubmit}
                allCategories={categories}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
