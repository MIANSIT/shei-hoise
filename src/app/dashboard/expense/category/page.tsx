"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Spin, Pagination } from "antd";
import { FolderOutlined } from "@ant-design/icons";

import { ExpenseCategory } from "@/lib/types/expense/type";
import { getExpenseCategories } from "@/lib/queries/expense/category/getExpenseCategories";
import { createCategory } from "@/lib/queries/expense/category/createExpenseCategory";
import { updateCategory } from "@/lib/queries/expense/category/updateExpenseCategory";
import { deleteCategory } from "@/lib/queries/expense/category/deleteExpenseCategory";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";

import { CategoryHeader } from "@/app/components/admin/dashboard/expense/category/CategoryHeader";
import { CategoryGrid } from "@/app/components/admin/dashboard/expense/category/CategoryGrid";
import { CategoryFormModal } from "@/app/components/admin/dashboard/expense/category/CategoryFormModal";
import { DeleteConfirmModal } from "@/app/components/admin/dashboard/expense/category/DeleteConfirmModal";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";
import {
  getStoreSubscription,
  type StoreSubscription,
} from "@/lib/queries/subscription/getStoreSubscription";
import { hasFeature } from "@/lib/utils/planFeatures";

export default function CategoriesPage() {
  const { success, error } = useSheiNotification();
  const t = useTranslation();
  const n = useLocalNum();
  const { storeId, loading: userLoading } = useCurrentUser();

  const [subscription, setSubscription] = useState<StoreSubscription | null>(
    null,
  );
  const [subLoading, setSubLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    setSubLoading(true);
    getStoreSubscription(storeId)
      .then(setSubscription)
      .finally(() => setSubLoading(false));
  }, [storeId]);

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

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

  const fetchCategories = useCallback(
    async (opts?: { page?: number; size?: number; query?: string }) => {
      if (!storeId) return;
      if (isFetchingRef.current) return;

      const page = opts?.page ?? currentPage;
      const size = opts?.size ?? pageSize;
      const query = opts?.query ?? search;

      try {
        isFetchingRef.current = true;
        if (page === 1 && !query) setLoading(true);
        else setPaginationLoading(true);

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
          err instanceof Error ? err.message : t.admin.expCatFetchFailed,
        );
      } finally {
        setLoading(false);
        setPaginationLoading(false);
        isFetchingRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeId],
  );

  useEffect(() => {
    if (storeId) fetchCategories({ page: 1, size: pageSize, query: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(value);
      setCurrentPage(1);
    }, 300);
  }, []);

  useEffect(() => {
    if (!storeId) return;
    fetchCategories({ page: currentPage, size: pageSize, query: search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, currentPage, pageSize, storeId]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handlePageChange = (page: number, newPageSize?: number) => {
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setCurrentPage(1);
    } else {
      setCurrentPage(page);
    }
  };

  const handleCreate = async (values: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    is_active?: boolean;
  }) => {
    if (!storeId) return error(t.admin.expCatStoreNotFound);
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
      success(t.admin.expCatCreated);
      setIsFormModalOpen(false);
      setCurrentPage(1);
      await fetchCategories({ page: 1, size: pageSize, query: search });
    } catch (err) {
      error(err instanceof Error ? err.message : t.admin.expCatCreateFailed);
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
      success(t.admin.expCatUpdated);
      setIsFormModalOpen(false);
      await fetchCategories({
        page: currentPage,
        size: pageSize,
        query: search,
      });
    } catch (err) {
      error(err instanceof Error ? err.message : t.admin.expCatUpdateFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory(deleteTarget.id);
      success(t.admin.expCatDeleted);
      const nextPage =
        categories.length === 1 && currentPage > 1
          ? currentPage - 1
          : currentPage;
      setCurrentPage(nextPage);
      await fetchCategories({ page: nextPage, size: pageSize, query: search });
    } catch (err) {
      error(err instanceof Error ? err.message : t.admin.expCatDeleteFailed);
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
    if (editingCategory) handleUpdate(values);
    else handleCreate(values);
  };
  const handleModalClose = () => {
    setIsFormModalOpen(false);
    setEditingCategory(null);
  };
  const handleDeleteModalClose = () => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  const showLoading = loading || userLoading;

  if (userLoading || subLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Spin size="large" />
      </div>
    );
  }

  if (!hasFeature(subscription, "expense_tracking")) {
    return <FeatureLocked />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, #667eea, #764ba2)",
              }}
            >
              <FolderOutlined style={{ color: "white", fontSize: 18 }} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white m-0 tracking-tight leading-tight">
                {t.admin.expCatTitle}
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 m-0 hidden sm:block">
                {t.admin.expCatSubtitle}
              </p>
            </div>
          </div>

          {/* Search + New button */}
          <CategoryHeader
            search={searchInput}
            onSearchChange={handleSearchChange}
            onNewCategory={openCreate}
          />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 sm:py-7 flex flex-col gap-4 sm:gap-5">
        {showLoading ? (
          <div className="flex justify-center mt-32">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <CategoryGrid
              categories={categories}
              search={search}
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
                  showTotal={(total) => `${t.admin.expCatTotalLabel} ${n(total)} ${t.admin.expCatCategoriesLabel}`}
                  pageSizeOptions={["8", "12", "24", "48"]}
                  disabled={paginationLoading}
                />
              </div>
            )}
          </>
        )}
      </div>

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
