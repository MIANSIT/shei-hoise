"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Spin, Pagination } from "antd";

import { ExpenseCategory } from "@/lib/types/expense/type";
import { getExpenseCategories } from "@/lib/queries/expense/getExpenseCategories";
import { createCategory } from "@/lib/queries/expense/createExpenseCategory";
import { updateCategory } from "@/lib/queries/expense/updateExpenseCategory";
import { deleteCategory } from "@/lib/queries/expense/deleteExpenseCategory";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

import { CategoryHeader } from "@/app/components/admin/dashboard/expense/CategoryHeader";
import { CategoryGrid } from "@/app/components/admin/dashboard/expense/CategoryGrid";
import { CategoryFormModal } from "@/app/components/admin/dashboard/expense/CategoryFormModal";
import { DeleteConfirmModal } from "@/app/components/admin/dashboard/expense/DeleteConfirmModal";

export default function CategoriesPage() {
  const { success, error } = useSheiNotification();
  const { storeId, loading: userLoading } = useCurrentUser();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Use a "committed" search value that only updates after debounce
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ExpenseCategory | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(
    null,
  );
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isFetchingRef = useRef(false);

  // ─── Core fetch: depends on committed state values ────────────────────────

  const fetchCategories = useCallback(
    async (opts?: { page?: number; size?: number; query?: string }) => {
      if (!storeId) return;
      if (isFetchingRef.current) return;

      const page = opts?.page ?? currentPage;
      const size = opts?.size ?? pageSize;
      const query = opts?.query ?? search;

      try {
        isFetchingRef.current = true;

        if (page === 1 && !query) {
          setLoading(true);
        } else {
          setPaginationLoading(true);
        }

        const response = await getExpenseCategories({
          storeId,
          page,
          pageSize: size,
          search: query || undefined,
        });

        setCategories(response.data || []);
        setTotalItems(response.total);
        setTotalPages(response.totalPages);
      } catch (err) {
        error(
          err instanceof Error ? err.message : "Failed to fetch categories",
        );
      } finally {
        setLoading(false);
        setPaginationLoading(false);
        isFetchingRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeId], // intentionally minimal — we pass overrides explicitly
  );

  // Initial fetch
  useEffect(() => {
    if (storeId) {
      fetchCategories({ page: 1, size: pageSize, query: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // ─── Search: debounce input → commit to `search` → fetch ─────────────────

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      // Commit the search value, then reset page
      setSearch(value);
      setCurrentPage(1);
    }, 300);
  }, []);

  // Whenever committed `search` or `currentPage` or `pageSize` changes, re-fetch
  useEffect(() => {
    if (!storeId) return;
    fetchCategories({ page: currentPage, size: pageSize, query: search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, currentPage, pageSize, storeId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // ─── Pagination ───────────────────────────────────────────────────────────

  const handlePageChange = (page: number, newPageSize?: number) => {
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setCurrentPage(1);
    } else {
      setCurrentPage(page);
    }
    // The useEffect above will trigger the fetch automatically
  };

  // ─── CRUD Handlers ────────────────────────────────────────────────────────

  const handleCreate = async (values: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    is_active?: boolean;
  }) => {
    if (!storeId) return error("Store ID not found.");

    try {
      setSaving(true);
      await createCategory({
        store_id: storeId,
        name: values.name.trim(),
        description: values.description?.trim(),
        icon: values.icon,
        color: values.color,
        is_active: values.is_active ?? true,
      });

      success("Category created successfully");
      setIsFormModalOpen(false);
      setCurrentPage(1);
      await fetchCategories({ page: 1, size: pageSize, query: search });
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (values: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    is_active?: boolean;
  }) => {
    if (!storeId || !editingCategory) return;

    try {
      setSaving(true);
      await updateCategory({
        id: editingCategory.id,
        name: values.name.trim(),
        description: values.description?.trim(),
        icon: values.icon,
        color: values.color,
        is_active: values.is_active ?? true,
      });

      success("Category updated successfully");
      setIsFormModalOpen(false);
      await fetchCategories({
        page: currentPage,
        size: pageSize,
        query: search,
      });
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteCategory(deleteTarget.id);
      success("Category deleted");

      const nextPage =
        categories.length === 1 && currentPage > 1
          ? currentPage - 1
          : currentPage;

      setCurrentPage(nextPage);
      await fetchCategories({ page: nextPage, size: pageSize, query: search });
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  const openCreate = () => {
    setEditingCategory(null);
    setIsFormModalOpen(true);
  };

  const openEdit = (cat: ExpenseCategory) => {
    setEditingCategory(cat);
    setIsFormModalOpen(true);
  };

  const openDelete = (cat: ExpenseCategory) => {
    setDeleteTarget(cat);
    setDeleteModalOpen(true);
  };

  const handleFormSubmit = (values: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    is_active?: boolean;
  }) => {
    if (editingCategory) {
      handleUpdate(values);
    } else {
      handleCreate(values);
    }
  };

  const handleModalClose = () => {
    setIsFormModalOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteModalClose = () => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const showLoading = loading || userLoading;

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <CategoryHeader
        search={searchInput} // ← display value (immediate)
        onSearchChange={handleSearchChange}
        onNewCategory={openCreate}
      />

      {showLoading ? (
        <div className="flex justify-center mt-32">
          <Spin size="large" />
        </div>
      ) : (
        <>
          <CategoryGrid
            categories={categories}
            search={search} // ← committed search for empty-state message
            onEdit={openEdit}
            onDelete={openDelete}
          />

          {categories.length > 0 && totalPages > 0 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                current={currentPage}
                total={totalItems}
                pageSize={pageSize}
                onChange={handlePageChange}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `Total ${total} categories`}
                pageSizeOptions={["8", "12", "24", "48"]}
                disabled={paginationLoading}
              />
            </div>
          )}
        </>
      )}

      <CategoryFormModal
        open={isFormModalOpen}
        saving={saving}
        editingCategory={editingCategory}
        onClose={handleModalClose}
        onSubmit={handleFormSubmit}
      />

      <DeleteConfirmModal
        open={deleteModalOpen}
        target={deleteTarget}
        onClose={handleDeleteModalClose}
        onConfirm={handleDelete}
      />
    </div>
  );
}
