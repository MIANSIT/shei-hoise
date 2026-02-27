"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button, Pagination } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Receipt } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useRouter } from "next/navigation";

import {
  getExpensesWithCategory,
  type ExpenseQueryParams,
} from "@/lib/queries/expense/getExpensesWithCategory";
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

import ExpenseStats from "@/app/components/admin/dashboard/expense/ExpenseStats";
import ExpenseFilters from "@/app/components/admin/dashboard/expense/ExpenseFilters";
import ExpenseTable from "@/app/components/admin/dashboard/expense/ExpenseTable";
import ExpenseFormModal from "@/app/components/admin/dashboard/expense/ExpenseFormModal";
import ExpenseExportButton from "@/app/components/admin/dashboard/expense/ExpenseExportButton";

dayjs.extend(relativeTime);

type ModalMode = "create" | "edit";

const PAGE_SIZE = 10;

export default function ExpensesPage() {
  const { storeId, storeSlug, loading: userLoading } = useCurrentUser();
  const { success, error } = useSheiNotification();
  const router = useRouter();

  // ── Data ──
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filters ──
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null,
  );
  const [page, setPage] = useState(1);

  // ── Modal ──
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Debounced search ──
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
  }, []);

  // ── Fetch expenses ──
  const fetchExpenses = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const params: ExpenseQueryParams = {
        storeId,
        search: debouncedSearch || undefined,
        categoryId: categoryFilter,
        paymentMethod: paymentFilter,
        dateFrom: dateRange ? dateRange[0].format("YYYY-MM-DD") : null,
        dateTo: dateRange ? dateRange[1].format("YYYY-MM-DD") : null,
        page,
        pageSize: PAGE_SIZE,
      };
      const result = await getExpensesWithCategory(params);
      setExpenses(result.data);
      setTotal(result.total);
    } catch (err) {
      console.error("[ExpensesPage] fetchExpenses failed:", err);
      error("Failed to load expenses. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [
    storeId,
    debouncedSearch,
    categoryFilter,
    paymentFilter,
    dateRange,
    page,
    error,
  ]);

  // ── Fetch categories once ──
  const fetchCategories = useCallback(async () => {
    if (!storeId) return;
    try {
      const categoryData = await getExpenseCategories({
        storeId,
        pageSize: 100,
      });
      setCategories(
        (categoryData.data || []).filter(
          (c) =>
            (c.is_default === true || c.store_id === storeId) &&
            c.is_active === true,
        ),
      );
    } catch (err) {
      console.error("[ExpensesPage] fetchCategories failed:", err);
    }
  }, [storeId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // ── Filter handlers (all reset page to 1) ──
  const handleCategoryChange = useCallback((v: string | null) => {
    setCategoryFilter(v);
    setPage(1);
  }, []);

  const handlePaymentChange = useCallback((v: string | null) => {
    setPaymentFilter(v);
    setPage(1);
  }, []);

  const handleDateRangeChange = useCallback(
    (v: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
      setDateRange(v);
      setPage(1);
    },
    [],
  );

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setCategoryFilter(null);
    setPaymentFilter(null);
    setDateRange(null);
    setPage(1);
  }, []);

  // ── Modal handlers ──
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
            fetchExpenses();
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
            fetchExpenses();
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
    [
      modalMode,
      storeId,
      editingExpense,
      success,
      error,
      closeModal,
      fetchExpenses,
    ],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        const deleted = await deleteExpense(id);
        if (deleted) {
          success("Expense deleted.");
          fetchExpenses();
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
    [success, error, fetchExpenses],
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
          <div className="flex items-center gap-2 shrink-0">
            <ExpenseExportButton
              expenses={expenses}
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

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 sm:py-7 flex flex-col gap-4 sm:gap-5">
        <ExpenseStats
          filtered={expenses}
          expenses={expenses}
          categories={categories}
        />

        <ExpenseFilters
          search={search}
          categoryFilter={categoryFilter}
          paymentFilter={paymentFilter}
          dateRange={dateRange}
          categories={categories}
          onSearchChange={handleSearchChange}
          onCategoryChange={handleCategoryChange}
          onPaymentChange={handlePaymentChange}
          onDateRangeChange={handleDateRangeChange}
          onClear={clearFilters}
        />

        <ExpenseTable
          data={expenses}
          loading={loading || userLoading}
          deletingId={deletingId}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />

        <div className="flex justify-center sm:justify-end">
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={handlePageChange}
            showSizeChanger={false}
            size="small"
            showTotal={(t, range) => `${range[0]}–${range[1]} of ${t} expenses`}
          />
        </div>
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
