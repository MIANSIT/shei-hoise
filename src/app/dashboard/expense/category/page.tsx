"use client";

import { useEffect, useState, useCallback } from "react";
import { Spin } from "antd";

import { ExpenseCategory } from "@/lib/types/expense/expense";
import { getCategories } from "@/lib/queries/expense/getCategories";
import { createCategory } from "@/lib/queries/expense/createCategory";
import { updateCategory } from "@/lib/queries/expense/updateCategory";
import { deleteCategory } from "@/lib/queries/expense/deleteCategory";
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
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ExpenseCategory | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(
    null,
  );
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // ─── API Calls ────────────────────────────────────────────────────────────

  const fetchCategories = useCallback(async () => {
    if (!storeId) return;
    try {
      setLoading(true);
      const data = await getCategories(storeId);
      setCategories(data || []);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  }, [storeId, error]);

  const handleCreate = async (values: {
    name: string;
    description?: string;
    is_active?: boolean;
  }) => {
    if (!storeId) return error("Store ID not found.");
    try {
      setSaving(true);
      await createCategory({
        store_id: storeId,
        name: values.name.trim(),
        description: values.description?.trim(),
        icon: undefined,
        color: undefined,
        is_active: values.is_active ?? true,
      });
      success("Category created successfully");
      setIsFormModalOpen(false);
      await fetchCategories();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (values: {
    name: string;
    description?: string;
    is_active?: boolean;
  }) => {
    if (!storeId || !editingCategory) return;
    try {
      setSaving(true);
      await updateCategory({
        id: editingCategory.id,
        name: values.name.trim(),
        description: values.description?.trim(),
        icon: undefined,
        color: undefined,
        is_active: values.is_active ?? true,
      });
      success("Category updated successfully");
      setIsFormModalOpen(false);
      await fetchCategories();
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
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      success("Category deleted");
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

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
    is_active?: boolean;
  }) => {
    if (editingCategory) {
      handleUpdate(values);
    } else {
      handleCreate(values);
    }
  };

  // ─── Filtered List ────────────────────────────────────────────────────────

  const filtered = categories.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase()),
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <CategoryHeader
        search={search}
        onSearchChange={setSearch}
        onNewCategory={openCreate}
      />

      {loading || userLoading ? (
        <div className="flex justify-center mt-32">
          <Spin size="large" />
        </div>
      ) : (
        <CategoryGrid
          categories={filtered}
          onEdit={openEdit}
          onDelete={openDelete}
        />
      )}

      <CategoryFormModal
        open={isFormModalOpen}
        saving={saving}
        editingCategory={editingCategory}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <DeleteConfirmModal
        open={deleteModalOpen}
        target={deleteTarget}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
