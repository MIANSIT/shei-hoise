"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Table,
  Button,
  Input,
  Select,
  DatePicker,
  Space,
  Empty,
  Tooltip,
  Dropdown,
  Modal,
  Form,
  InputNumber,
  message,
  Badge,
  Popconfirm,
  Spin,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import {
  Tag,
  Receipt,
  Store,
  CreditCard,
  FileText,
  Wallet,
  TrendingUp,
  LayoutGrid,
  Plus,
  ReceiptText,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Briefcase,
  Heart,
  Zap,
  Package,
  Wrench,
  Laptop,
  Coffee,
  Plane,
  Phone,
  Book,
  Music,
  Shirt,
  Pill,
  Dumbbell,
  GraduationCap,
  Building,
  type LucideProps,
} from "lucide-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { getExpensesWithCategory } from "@/lib/queries/expense/getExpensesWithCategory";
import { getExpenseCategories } from "@/lib/queries/expense/category/getExpenseCategories";
import {
  createExpense,
  CreateExpenseInput,
} from "@/lib/queries/expense/createExpense";
import {
  updateExpense,
  UpdateExpenseInput,
} from "@/lib/queries/expense/updateExpense";
import { deleteExpense } from "@/lib/queries/expense/deleteExpense";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { Expense, ExpenseCategory } from "@/lib/types/expense/type";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { ColumnsType } from "antd/es/table";

dayjs.extend(relativeTime);

const { RangePicker } = DatePicker;
const { Option } = Select;

// ─── Types ───────────────────────────────────────────────────────────────────

type LucideIcon = ForwardRefExoticComponent<
  LucideProps & RefAttributes<SVGSVGElement>
>;

type ModalMode = "create" | "edit";

// Form values coming from Ant Design Form
interface ExpenseFormValues {
  title: string;
  amount: number;
  expense_date: dayjs.Dayjs;
  category_id?: string;
  description?: string;
  payment_method?: string;
  platform?: string;
  vendor_name?: string;
  notes?: string;
}

// ─── Lucide icon map ─────────────────────────────────────────────────────────

const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  Tag,
  Receipt,
  Store,
  CreditCard,
  FileText,
  Wallet,
  TrendingUp,
  LayoutGrid,
  Plus,
  ReceiptText,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Briefcase,
  Heart,
  Zap,
  Package,
  Wrench,
  Laptop,
  Coffee,
  Plane,
  Phone,
  Book,
  Music,
  Shirt,
  Pill,
  Dumbbell,
  GraduationCap,
  Building,
};

function DynamicLucideIcon({
  name,
  size = 13,
  color = "currentColor",
  strokeWidth = 2,
}: {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const cleanName = name?.replace(/^Lucide/, "") || "Tag";
  const Icon = LUCIDE_ICON_MAP[cleanName] ?? Tag;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCategoryColor(category: {
  id: string;
  color?: string | null;
  name: string;
}) {
  if (category.color) return category.color;
  const palette = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#ef4444",
    "#14b8a6",
    "#f97316",
    "#84cc16",
  ];
  let hash = 0;
  for (let i = 0; i < category.id.length; i++)
    hash = category.id.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PAYMENT_METHOD_CONFIG: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  cash: { color: "#16a34a", bg: "#dcfce7", label: "Cash" },
  card: { color: "#2563eb", bg: "#dbeafe", label: "Card" },
  bank_transfer: { color: "#7c3aed", bg: "#ede9fe", label: "Bank Transfer" },
  online: { color: "#0891b2", bg: "#cffafe", label: "Online" },
  check: { color: "#d97706", bg: "#fef3c7", label: "Check" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const { storeId, loading: userLoading } = useCurrentUser();

  // Data state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null,
  );

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form] = Form.useForm<ExpenseFormValues>();

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = async () => {
    if (!storeId) return;
    setLoading(true);
    const [expenseData, categoryData] = await Promise.all([
      getExpensesWithCategory(storeId),
      getExpenseCategories({ storeId, pageSize: 100 }),
    ]);
    setExpenses(expenseData || []);
    const validCategories = (categoryData.data || []).filter(
      (c) => c.is_default === true || c.store_id === storeId,
    );
    setCategories(validCategories);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // ─── Filtered & computed ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch =
        !search ||
        e.title?.toLowerCase().includes(search.toLowerCase()) ||
        e.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.description?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !categoryFilter || e.category_id === categoryFilter;
      const matchPayment = !paymentFilter || e.payment_method === paymentFilter;
      const matchDate =
        !dateRange ||
        (dayjs(e.expense_date).isAfter(dateRange[0].subtract(1, "day")) &&
          dayjs(e.expense_date).isBefore(dateRange[1].add(1, "day")));
      return matchSearch && matchCategory && matchPayment && matchDate;
    });
  }, [expenses, search, categoryFilter, paymentFilter, dateRange]);

  const totalAmount = useMemo(
    () => filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [filtered],
  );
  const thisMonthTotal = useMemo(() => {
    const now = dayjs();
    return expenses
      .filter((e) => dayjs(e.expense_date).isSame(now, "month"))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses]);
  const lastMonthTotal = useMemo(() => {
    const last = dayjs().subtract(1, "month");
    return expenses
      .filter((e) => dayjs(e.expense_date).isSame(last, "month"))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses]);
  const monthChange =
    lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : 0;

  const hasFilters = search || categoryFilter || paymentFilter || dateRange;

  // ─── Modal helpers ──────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setModalMode("create");
    setEditingExpense(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (expense: Expense) => {
    setModalMode("edit");
    setEditingExpense(expense);
    form.setFieldsValue({
      title: expense.title,
      amount: expense.amount,
      expense_date: dayjs(expense.expense_date),
      category_id: expense.category_id || undefined,
      description: expense.description || undefined,
      payment_method: expense.payment_method || undefined,
      platform: expense.platform || undefined,
      vendor_name: expense.vendor_name || undefined,
      notes: expense.notes || undefined,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
    form.resetFields();
  };

  // ─── CRUD handlers ──────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const expenseDateStr = values.expense_date.format("YYYY-MM-DD");

      if (modalMode === "create") {
        const input: CreateExpenseInput = {
          store_id: storeId!,
          title: values.title,
          amount: values.amount,
          expense_date: expenseDateStr,
          ...(values.category_id ? { category_id: values.category_id } : {}),
          ...(values.description ? { description: values.description } : {}),
          ...(values.payment_method
            ? { payment_method: values.payment_method }
            : {}),
          ...(values.platform ? { platform: values.platform } : {}),
          ...(values.vendor_name ? { vendor_name: values.vendor_name } : {}),
          ...(values.notes ? { notes: values.notes } : {}),
        };
        const created = await createExpense(input);
        if (created) {
          // Optimistically prepend and refetch to get joined category
          message.success("Expense added successfully!");
          closeModal();
          await fetchData();
        } else {
          message.error("Failed to add expense. Please try again.");
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
          message.success("Expense updated successfully!");
          closeModal();
          // Update in-place so the table doesn't flicker
          setExpenses((prev) =>
            prev.map((e) => (e.id === updated.id ? updated : e)),
          );
        } else {
          message.error("Failed to update expense. Please try again.");
        }
      }
    } catch {
      // Form validation errors — Ant Design handles display
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const success = await deleteExpense(id);
    if (success) {
      message.success("Expense deleted.");
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } else {
      message.error("Failed to delete expense.");
    }
    setDeletingId(null);
  };

  // ─── Table columns ──────────────────────────────────────────────────────────

  const columns: ColumnsType<Expense> = [
    {
      title: "Expense",
      key: "title",
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              flexShrink: 0,
              background: record.category
                ? hexToRgba(getCategoryColor(record.category), 0.12)
                : "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {record.category?.icon ? (
              <DynamicLucideIcon
                name={record.category.icon}
                size={16}
                color={getCategoryColor(record.category)}
              />
            ) : (
              <Receipt size={16} color="#9ca3af" strokeWidth={2} />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm leading-tight">
              {record.title}
            </p>
            {record.vendor_name && (
              <div className="flex items-center gap-1 mt-0.5">
                <Store size={10} color="#9ca3af" strokeWidth={2} />
                <span className="text-xs text-gray-400">
                  {record.vendor_name}
                </span>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Category",
      key: "category",
      width: 180,
      render: (_, record) => {
        if (!record.category)
          return <span className="text-gray-300 text-xs">—</span>;
        const color = getCategoryColor(record.category);
        return (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0,
              background: hexToRgba(color, 0.08),
              border: `1px solid ${hexToRgba(color, 0.2)}`,
              borderRadius: 8,
              overflow: "hidden",
              maxWidth: 170,
            }}
          >
            {/* Left color bar */}
            <div
              style={{
                width: 4,
                alignSelf: "stretch",
                flexShrink: 0,
                background: color,
              }}
            />
            {/* Icon + label */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px 4px 8px",
              }}
            >
              <DynamicLucideIcon
                name={record.category.icon || "Tag"}
                size={12}
                color={color}
              />
              <span
                style={{
                  color,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {record.category.name}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      sorter: (a, b) => Number(a.amount) - Number(b.amount),
      width: 130,
      render: (amount: number) => (
        <span
          style={{ fontVariantNumeric: "tabular-nums" }}
          className="font-bold text-gray-900 text-sm"
        >
          $
          {Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: "Date",
      dataIndex: "expense_date",
      key: "expense_date",
      sorter: (a, b) =>
        dayjs(a.expense_date).unix() - dayjs(b.expense_date).unix(),
      defaultSortOrder: "descend",
      width: 140,
      render: (date: string) => (
        <div>
          <span className="text-gray-700 text-sm font-medium">
            {dayjs(date).format("MMM D, YYYY")}
          </span>
          <p className="text-gray-400 text-xs mt-0.5">
            {dayjs(date).fromNow()}
          </p>
        </div>
      ),
    },
    {
      title: "Payment",
      dataIndex: "payment_method",
      key: "payment_method",
      width: 150,
      render: (method: string) => {
        const cfg = PAYMENT_METHOD_CONFIG[method];
        if (!cfg) return <span className="text-gray-300 text-xs">—</span>;
        return (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: cfg.bg,
              borderRadius: 20,
              padding: "3px 10px 3px 8px",
            }}
          >
            <CreditCard size={11} color={cfg.color} strokeWidth={2.5} />
            <span style={{ color: cfg.color, fontSize: 11, fontWeight: 600 }}>
              {cfg.label}
            </span>
          </div>
        );
      },
    },
    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      width: 110,
      render: (platform: string) =>
        platform ? (
          <span
            style={{
              fontSize: 12,
              color: "#6b7280",
              background: "#f3f4f6",
              borderRadius: 6,
              padding: "3px 8px",
              fontWeight: 500,
            }}
          >
            {platform}
          </span>
        ) : (
          <span className="text-gray-200 text-xs">—</span>
        ),
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      render: (notes: string) =>
        notes ? (
          <Tooltip title={notes} placement="topLeft">
            <div className="flex items-center gap-1.5 cursor-pointer group">
              <FileText size={12} color="#a5b4fc" strokeWidth={2} />
              <span className="text-gray-400 text-xs truncate max-w-25 group-hover:text-indigo-500 transition-colors">
                {notes}
              </span>
            </div>
          </Tooltip>
        ) : (
          <span className="text-gray-200 text-xs">—</span>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 48,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: "edit",
                icon: <EditOutlined style={{ color: "#6366f1" }} />,
                label: <span className="text-gray-700 text-sm">Edit</span>,
                onClick: () => openEditModal(record),
              },
              { type: "divider" },
              {
                key: "delete",
                icon:
                  deletingId === record.id ? (
                    <Spin size="small" />
                  ) : (
                    <DeleteOutlined />
                  ),
                label: (
                  <Popconfirm
                    title="Delete expense?"
                    description="This action cannot be undone."
                    onConfirm={() => handleDelete(record.id)}
                    okText="Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <span>Delete</span>
                  </Popconfirm>
                ),
                danger: true,
              },
            ],
          }}
          trigger={["click"]}
          placement="bottomRight"
        >
          <Button
            type="text"
            icon={<MoreOutlined />}
            size="small"
            style={{ color: "#d1d5db", borderRadius: 8 }}
            className="hover:bg-gray-100! hover:text-gray-600!"
          />
        </Dropdown>
      ),
    },
  ];

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const stats = [
    {
      title: "Filtered Total",
      value: `$${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: <Wallet size={20} color="#6366f1" strokeWidth={1.8} />,
      iconBg: "linear-gradient(135deg, #eef2ff, #e0e7ff)",
      trend: null as { up: boolean; pct: string } | null,
      sub: `${filtered.length} record${filtered.length !== 1 ? "s" : ""}`,
    },
    {
      title: "This Month",
      value: `$${thisMonthTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: <TrendingUp size={20} color="#10b981" strokeWidth={1.8} />,
      iconBg: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
      trend:
        monthChange !== 0
          ? { up: monthChange > 0, pct: Math.abs(monthChange).toFixed(1) }
          : null,
      sub: "vs last month",
    },
    {
      title: "Categories",
      value: String(categories.length),
      icon: <LayoutGrid size={20} color="#8b5cf6" strokeWidth={1.8} />,
      iconBg: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
      trend: null as { up: boolean; pct: string } | null,
      sub: "available",
    },
  ];

  // ─── Shared category select options (reused in filter + modal) ──────────────

  const renderCategoryOptions = () =>
    categories.map((c) => {
      const color = getCategoryColor(c);
      return (
        <Option key={c.id} value={c.id} label={c.name}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Color swatch + icon */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                flexShrink: 0,
                background: hexToRgba(color, 0.15),
                border: `1.5px solid ${hexToRgba(color, 0.35)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <DynamicLucideIcon
                name={c.icon || "Tag"}
                size={13}
                color={color}
              />
            </div>
            {/* Name + default badge */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}
                >
                  {c.name}
                </span>
                {c.is_default && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      color: "#9ca3af",
                      background: "#f3f4f6",
                      padding: "1px 5px",
                      borderRadius: 4,
                      textTransform: "uppercase",
                    }}
                  >
                    Default
                  </span>
                )}
              </div>
            </div>
            {/* Color dot on the right */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
                boxShadow: `0 0 0 2px ${hexToRgba(color, 0.25)}`,
              }}
            />
          </div>
        </Option>
      );
    });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: "#f7f8fc" }}>
      {/* Header */}
      <div
        style={{
          background: "white",
          borderBottom: "1px solid #f0f0f5",
          padding: "20px 32px",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Receipt size={18} color="white" strokeWidth={2} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#111827",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                Expenses
              </h1>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                Track and manage store expenses
              </p>
            </div>
          </div>
          <Space>
            <Button
              icon={<DownloadOutlined />}
              style={{
                borderRadius: 8,
                borderColor: "#e5e7eb",
                color: "#6b7280",
                height: 36,
              }}
            >
              Export
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                height: 36,
                boxShadow: "0 4px 14px rgba(102,126,234,0.4)",
              }}
            >
              Add Expense
            </Button>
          </Space>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "28px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {stats.map((stat) => (
            <div
              key={stat.title}
              style={{
                background: "white",
                borderRadius: 16,
                border: "1px solid #f0f0f5",
                padding: "20px 22px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                transition: "box-shadow 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 4px 16px rgba(0,0,0,0.08)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)")
              }
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: stat.iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {stat.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    margin: 0,
                  }}
                >
                  {stat.title}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 3,
                  }}
                >
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: "#111827",
                      letterSpacing: "-0.03em",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {stat.value}
                  </span>
                  {stat.trend && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: stat.trend.up ? "#ef4444" : "#10b981",
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        background: stat.trend.up ? "#fef2f2" : "#ecfdf5",
                        padding: "2px 7px",
                        borderRadius: 20,
                      }}
                    >
                      {stat.trend.up ? (
                        <ArrowUpOutlined style={{ fontSize: 9 }} />
                      ) : (
                        <ArrowDownOutlined style={{ fontSize: 9 }} />
                      )}
                      {stat.trend.pct}%
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: "#d1d5db",
                    margin: 0,
                    marginTop: 1,
                  }}
                >
                  {stat.sub}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div
          style={{
            background: "white",
            borderRadius: 16,
            border: "1px solid #f0f0f5",
            padding: "14px 20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
            }}
          >
            <Input
              prefix={
                <SearchOutlined style={{ color: "#d1d5db", fontSize: 13 }} />
              }
              placeholder="Search title, vendor, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 240, borderRadius: 10, height: 36 }}
              allowClear
            />
            <Select
              placeholder={
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Tag size={12} color="#9ca3af" strokeWidth={2} />
                  <span>Category</span>
                </span>
              }
              allowClear
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: 200 }}
              optionLabelProp="label"
              optionRender={(option) => {
                const cat = categories.find((c) => c.id === option.value);
                if (!cat) return <span>{option.label}</span>;
                const color = getCategoryColor(cat);
                return (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        flexShrink: 0,
                        background: hexToRgba(color, 0.15),
                        border: `1.5px solid ${hexToRgba(color, 0.35)}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <DynamicLucideIcon
                        name={cat.icon || "Tag"}
                        size={13}
                        color={color}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#111827",
                          }}
                        >
                          {cat.name}
                        </span>
                        {cat.is_default && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: "0.05em",
                              color: "#9ca3af",
                              background: "#f3f4f6",
                              padding: "1px 5px",
                              borderRadius: 4,
                              textTransform: "uppercase",
                            }}
                          >
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: color,
                        flexShrink: 0,
                        boxShadow: `0 0 0 2px ${hexToRgba(color, 0.25)}`,
                      }}
                    />
                  </div>
                );
              }}
            >
              {renderCategoryOptions()}
            </Select>
            <Select
              placeholder={
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CreditCard size={12} color="#9ca3af" strokeWidth={2} />
                  <span>Payment</span>
                </span>
              }
              allowClear
              value={paymentFilter}
              onChange={setPaymentFilter}
              style={{ width: 170 }}
            >
              {Object.entries(PAYMENT_METHOD_CONFIG).map(([key, cfg]) => (
                <Option key={key} value={key}>
                  <span
                    style={{ color: cfg.color, fontWeight: 500, fontSize: 13 }}
                  >
                    {cfg.label}
                  </span>
                </Option>
              ))}
            </Select>
            <RangePicker
              value={dateRange}
              onChange={(v) =>
                setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)
              }
              style={{ borderRadius: 10, height: 36 }}
            />
            {hasFilters && (
              <Button
                type="text"
                size="small"
                icon={<ClearOutlined />}
                onClick={() => {
                  setSearch("");
                  setCategoryFilter(null);
                  setPaymentFilter(null);
                  setDateRange(null);
                }}
                style={{
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  height: 32,
                  borderRadius: 8,
                }}
              >
                Clear filters
              </Button>
            )}
            {hasFilters && (
              <Badge
                count={
                  [search, categoryFilter, paymentFilter, dateRange].filter(
                    Boolean,
                  ).length
                }
                style={{
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                }}
              />
            )}
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            background: "white",
            borderRadius: 16,
            border: "1px solid #f0f0f5",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          <style>{`
            .expense-table .ant-table-thead > tr > th {
              background: #fafafa !important;
              color: #6b7280 !important;
              font-size: 11px !important;
              font-weight: 700 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.06em !important;
              border-bottom: 1px solid #f0f0f5 !important;
              padding: 12px 16px !important;
            }
            .expense-table .ant-table-tbody > tr > td {
              padding: 14px 16px !important;
              border-bottom: 1px solid #f9fafb !important;
            }
            .expense-table .ant-table-tbody > tr:hover > td {
              background: #fafbff !important;
            }
            .expense-table .ant-table-tbody > tr:last-child > td {
              border-bottom: none !important;
            }
            .expense-table .ant-table-column-sorter-up.active .anticon,
            .expense-table .ant-table-column-sorter-down.active .anticon {
              color: #6366f1 !important;
            }
          `}</style>
          <Table
            columns={columns}
            dataSource={filtered}
            loading={loading || userLoading}
            rowKey="id"
            className="expense-table"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => (
                <span style={{ color: "#9ca3af", fontSize: 13 }}>
                  {total} expense{total !== 1 ? "s" : ""}
                </span>
              ),
              style: { padding: "12px 20px", borderTop: "1px solid #f0f0f5" },
            }}
            locale={{
              emptyText: (
                <div style={{ padding: "60px 0" }}>
                  <Empty
                    image={
                      <div
                        style={{ display: "flex", justifyContent: "center" }}
                      >
                        <div
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 20,
                            background:
                              "linear-gradient(135deg, #eef2ff, #e0e7ff)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <ReceiptText
                            size={28}
                            color="#a5b4fc"
                            strokeWidth={1.5}
                          />
                        </div>
                      </div>
                    }
                    description={
                      <div>
                        <p
                          style={{
                            color: "#374151",
                            fontWeight: 600,
                            margin: 0,
                          }}
                        >
                          No expenses found
                        </p>
                        <p
                          style={{
                            color: "#9ca3af",
                            fontSize: 13,
                            margin: "4px 0 0",
                          }}
                        >
                          Try adjusting your filters or add a new expense
                        </p>
                      </div>
                    }
                  />
                </div>
              ),
            }}
          />
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        title={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "4px 0",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {modalMode === "create" ? (
                <Plus size={16} color="white" strokeWidth={2.5} />
              ) : (
                <EditOutlined style={{ color: "white", fontSize: 14 }} />
              )}
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
              {modalMode === "create" ? "New Expense" : "Edit Expense"}
            </span>
          </div>
        }
        open={isModalOpen}
        onCancel={closeModal}
        footer={
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              paddingTop: 4,
            }}
          >
            <Button
              style={{ borderRadius: 8, height: 36 }}
              onClick={closeModal}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              loading={submitting}
              onClick={handleSubmit}
              style={{
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                border: "none",
                borderRadius: 8,
                height: 36,
                fontWeight: 600,
                boxShadow: "0 4px 14px rgba(102,126,234,0.4)",
              }}
            >
              {modalMode === "create" ? "Save Expense" : "Update Expense"}
            </Button>
          </div>
        }
        width={540}
        style={{ borderRadius: 16 }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {/* Title — full width */}
          <Form.Item
            name="title"
            label={
              <span style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}>
                Title
              </span>
            }
            rules={[{ required: true, message: "Title is required" }]}
          >
            <Input
              placeholder="e.g. Office Supplies"
              style={{ borderRadius: 8, height: 38 }}
            />
          </Form.Item>

          {/* Amount + Date */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 16px",
            }}
          >
            <Form.Item
              name="amount"
              label={
                <span
                  style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}
                >
                  Amount
                </span>
              }
              rules={[{ required: true, message: "Amount is required" }]}
            >
              <InputNumber
                prefix="$"
                min={0}
                precision={2}
                style={{ borderRadius: 8, width: "100%", height: 38 }}
              />
            </Form.Item>
            <Form.Item
              name="expense_date"
              label={
                <span
                  style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}
                >
                  Date
                </span>
              }
              rules={[{ required: true, message: "Date is required" }]}
            >
              <DatePicker
                style={{ borderRadius: 8, width: "100%", height: 38 }}
              />
            </Form.Item>
          </div>

          {/* Category + Payment */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 16px",
            }}
          >
            <Form.Item
              name="category_id"
              label={
                <span
                  style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}
                >
                  Category
                </span>
              }
            >
              <Select
                placeholder="Select category"
                style={{ borderRadius: 8 }}
                allowClear
                optionLabelProp="label"
                optionRender={(option) => {
                  const cat = categories.find((c) => c.id === option.value);
                  if (!cat) return <span>{option.label}</span>;
                  const color = getCategoryColor(cat);
                  return (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          flexShrink: 0,
                          background: hexToRgba(color, 0.15),
                          border: `1.5px solid ${hexToRgba(color, 0.35)}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <DynamicLucideIcon
                          name={cat.icon || "Tag"}
                          size={13}
                          color={color}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: "#111827",
                            }}
                          >
                            {cat.name}
                          </span>
                          {cat.is_default && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: "0.05em",
                                color: "#9ca3af",
                                background: "#f3f4f6",
                                padding: "1px 5px",
                                borderRadius: 4,
                                textTransform: "uppercase",
                              }}
                            >
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: color,
                          flexShrink: 0,
                          boxShadow: `0 0 0 2px ${hexToRgba(color, 0.25)}`,
                        }}
                      />
                    </div>
                  );
                }}
              >
                {renderCategoryOptions()}
              </Select>
            </Form.Item>
            <Form.Item
              name="payment_method"
              label={
                <span
                  style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}
                >
                  Payment Method
                </span>
              }
            >
              <Select placeholder="Select method" allowClear>
                {Object.entries(PAYMENT_METHOD_CONFIG).map(([key, cfg]) => (
                  <Option key={key} value={key}>
                    <span style={{ color: cfg.color, fontWeight: 500 }}>
                      {cfg.label}
                    </span>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          {/* Vendor + Platform */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 16px",
            }}
          >
            <Form.Item
              name="vendor_name"
              label={
                <span
                  style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}
                >
                  Vendor
                </span>
              }
            >
              <Input
                placeholder="Vendor or supplier name"
                style={{ borderRadius: 8, height: 38 }}
              />
            </Form.Item>
            <Form.Item
              name="platform"
              label={
                <span
                  style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}
                >
                  Platform
                </span>
              }
            >
              <Input
                placeholder="e.g. Web, Social Boost, TikTok Ads..."
                style={{ borderRadius: 8, height: 38 }}
              />
            </Form.Item>
          </div>

          {/* Description — full width */}
          <Form.Item
            name="description"
            label={
              <span style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}>
                Description
              </span>
            }
          >
            <Input.TextArea
              rows={2}
              placeholder="Brief description of the expense..."
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          {/* Notes — full width */}
          <Form.Item
            name="notes"
            label={
              <span style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}>
                Notes
              </span>
            }
          >
            <Input.TextArea
              rows={2}
              placeholder="Any additional notes..."
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
