"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Receipt } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { getExpensesWithCategory } from "@/lib/queries/expense/getExpensesWithCategory";
import { getExpenseCategories } from "@/lib/queries/expense/category/getExpenseCategories";
import {
  createExpense,
  type CreateExpenseInput,
} from "@/lib/queries/expense/createExpense";
import {
  updateExpense,
  type UpdateExpenseInput,
} from "@/lib/queries/expense/updateExpense";
import { deleteExpense } from "@/lib/queries/expense/deleteExpense";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import type {
  Expense,
  ExpenseCategory,
  ExpenseFormValues,
} from "@/lib/types/expense/type";
import { useRouter } from "next/navigation";
import ExpenseStats from "@/app/components/admin/dashboard/expense/ExpenseStats";
import ExpenseFilters from "@/app/components/admin/dashboard/expense/ExpenseFilters";
import ExpenseTable from "@/app/components/admin/dashboard/expense/ExpenseTable";
import ExpenseFormModal from "@/app/components/admin/dashboard/expense/ExpenseFormModal";
import ExpenseExportButton from "@/app/components/admin/dashboard/expense/ExpenseExportButton";

dayjs.extend(relativeTime);

type ModalMode = "create" | "edit";

export default function ExpensesPage() {
  const { storeId, storeSlug, loading: userLoading } = useCurrentUser();
  const { success, error } = useSheiNotification();
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null,
  );

  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [expenseData, categoryData] = await Promise.all([
        getExpensesWithCategory(storeId),
        getExpenseCategories({ storeId, pageSize: 100 }),
      ]);
      setExpenses(expenseData || []);
      setCategories(
        (categoryData.data || []).filter(
          (c) =>
            (c.is_default === true || c.store_id === storeId) &&
            c.is_active === true,
        ),
      );
    } catch (err) {
      console.error("[ExpensesPage] fetchData failed:", err);
      error("Failed to load expenses. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [storeId, error]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(
    () =>
      expenses.filter((e) => {
        const q = search.toLowerCase();
        const matchSearch =
          !search ||
          e.title?.toLowerCase().includes(q) ||
          e.vendor_name?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q);
        const matchCategory =
          !categoryFilter || e.category_id === categoryFilter;
        const matchPayment =
          !paymentFilter || e.payment_method === paymentFilter;
        const matchDate =
          !dateRange ||
          (dayjs(e.expense_date).isAfter(dateRange[0].subtract(1, "day")) &&
            dayjs(e.expense_date).isBefore(dateRange[1].add(1, "day")));
        return matchSearch && matchCategory && matchPayment && matchDate;
      }),
    [expenses, search, categoryFilter, paymentFilter, dateRange],
  );

  const openCreateModal = useCallback(() => {
    setModalMode("create");
    setEditingExpense(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((expense: Expense) => {
    setModalMode("edit");
    setEditingExpense(expense);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingExpense(null);
  }, [submitting]);

  const handleSubmit = useCallback(
    async (values: ExpenseFormValues) => {
      setSubmitting(true);
      try {
        const expenseDateStr = values.expense_date.format("YYYY-MM-DD");
        if (modalMode === "create") {
          const input: CreateExpenseInput = {
            store_id: storeId!,
            title: values.title,
            amount: values.amount,
            expense_date: expenseDateStr,
            ...(values.category_id && { category_id: values.category_id }),
            ...(values.description && { description: values.description }),
            ...(values.payment_method && {
              payment_method: values.payment_method,
            }),
            ...(values.platform && { platform: values.platform }),
            ...(values.vendor_name && { vendor_name: values.vendor_name }),
            ...(values.notes && { notes: values.notes }),
          };
          const created = await createExpense(input);
          if (created) {
            success("Expense added successfully!");
            closeModal();
            await fetchData();
          } else {
            error("Failed to add expense. Please try again.");
          }
        } else if (modalMode === "edit" && editingExpense) {
          const input: UpdateExpenseInput = {
            id: editingExpense.id,
            title: values.title,
            amount: values.amount,
            expense_date: expenseDateStr,
            category_id: values.category_id ?? undefined,
            description: values.description ?? undefined,
            payment_method: values.payment_method ?? undefined,
            platform: values.platform ?? undefined,
            vendor_name: values.vendor_name ?? undefined,
            notes: values.notes ?? undefined,
          };
          const updated = await updateExpense(input);
          if (updated) {
            success("Expense updated successfully!");
            closeModal();
            setExpenses((prev) =>
              prev.map((e) => (e.id === updated.id ? updated : e)),
            );
          } else {
            error("Failed to update expense. Please try again.");
          }
        }
      } catch (err) {
        console.error("[ExpensesPage] handleSubmit failed:", err);
        error("Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [modalMode, storeId, editingExpense, success, error, closeModal, fetchData],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        const deleted = await deleteExpense(id);
        if (deleted) {
          success("Expense deleted.");
          setExpenses((prev) => prev.filter((e) => e.id !== id));
        } else {
          error("Failed to delete expense.");
        }
      } catch (err) {
        console.error("[ExpensesPage] handleDelete failed:", err);
        error("Something went wrong. Please try again.");
      } finally {
        setDeletingId(null);
      }
    },
    [success, error],
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter(null);
    setPaymentFilter(null);
    setDateRange(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-400 to-purple-600 flex items-center justify-center shrink-0">
              <Receipt size={18} color="white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white m-0 tracking-tight leading-tight">
                Expenses
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 m-0 hidden sm:block">
                Track and manage store expenses
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <ExpenseExportButton
              expenses={filtered}
              storeSlug={storeSlug ?? undefined}
            />
            <Button
              icon={<PlusOutlined />}
              onClick={() => router.push("/dashboard/expense/category")}
              className="font-semibold rounded-xl h-9"
            >
              <span className="hidden sm:inline">Add Category</span>
              <span className="sm:hidden">Category</span>
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
              className="font-semibold rounded-xl h-9"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                boxShadow: "0 4px 14px rgba(102,126,234,0.4)",
              }}
            >
              <span className="hidden sm:inline">Add Expense</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 sm:py-7 flex flex-col gap-4 sm:gap-5">
        <ExpenseStats
          filtered={filtered}
          expenses={expenses}
          categories={categories}
        />

        <ExpenseFilters
          search={search}
          categoryFilter={categoryFilter}
          paymentFilter={paymentFilter}
          dateRange={dateRange}
          categories={categories}
          onSearchChange={setSearch}
          onCategoryChange={setCategoryFilter}
          onPaymentChange={setPaymentFilter}
          onDateRangeChange={setDateRange}
          onClear={clearFilters}
        />

        <ExpenseTable
          data={filtered}
          loading={loading || userLoading}
          deletingId={deletingId}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
      </div>

      <ExpenseFormModal
        open={isModalOpen}
        mode={modalMode}
        editingExpense={editingExpense}
        categories={categories}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={closeModal}
      />
    </div>
  );
}
