"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Table,
  Tag,
  Button,
  Input,
  Select,
  DatePicker,
  Space,
  // Statistic,
  Empty,
  Tooltip,
  Dropdown,
  Modal,
  Form,
  InputNumber,
  message,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  FilterOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  CalendarOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { getExpensesWithCategory } from "@/lib/queries/expense/getExpensesWithCategory";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { Expense } from "@/lib/types/expense/type";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

const { RangePicker } = DatePicker;
const { Option } = Select;

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  cash: "green",
  card: "blue",
  bank_transfer: "purple",
  online: "cyan",
  check: "orange",
};

const PLATFORM_COLORS: Record<string, string> = {
  web: "blue",
  mobile: "purple",
  pos: "green",
};

export default function ExpensesPage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!storeId) return;
    (async () => {
      setLoading(true);
      const data = await getExpensesWithCategory(storeId);
      setExpenses(data || []);
      setLoading(false);
    })();
  }, [storeId]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    expenses.forEach((e) => {
      if (e.category) map.set(e.category.id, e.category.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [expenses]);

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

  const columns: ColumnsType<Expense> = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (text, record) => (
        <div>
          <p className="font-semibold text-gray-800 text-sm">{text}</p>
          {record.vendor_name && (
            <p className="text-xs text-gray-400 mt-0.5">{record.vendor_name}</p>
          )}
        </div>
      ),
    },
    {
      title: "Category",
      key: "category",
      render: (_, record) =>
        record.category ? (
          <Tag
            color={record.category.color || "default"}
            style={{
              borderRadius: "20px",
              fontWeight: 500,
              fontSize: "11px",
              padding: "2px 10px",
            }}
          >
            {record.category.icon && (
              <span className="mr-1">{record.category.icon}</span>
            )}
            {record.category.name}
          </Tag>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      sorter: (a, b) => Number(a.amount) - Number(b.amount),
      render: (amount) => (
        <span className="font-bold text-gray-900 text-sm">
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
      render: (date) => (
        <span className="text-gray-600 text-sm">
          {dayjs(date).format("MMM D, YYYY")}
        </span>
      ),
    },
    {
      title: "Payment",
      dataIndex: "payment_method",
      key: "payment_method",
      render: (method) =>
        method ? (
          <Tag
            color={PAYMENT_METHOD_COLORS[method] || "default"}
            style={{
              borderRadius: "20px",
              fontSize: "11px",
              padding: "2px 10px",
            }}
          >
            {method.replace("_", " ").toUpperCase()}
          </Tag>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        ),
    },
    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      render: (platform) =>
        platform ? (
          <Tag
            color={PLATFORM_COLORS[platform] || "default"}
            style={{
              borderRadius: "20px",
              fontSize: "11px",
              padding: "2px 10px",
            }}
          >
            {platform.toUpperCase()}
          </Tag>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        ),
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      render: (notes) =>
        notes ? (
          <Tooltip title={notes}>
            <span className="text-gray-500 text-xs truncate max-w-30 block cursor-pointer hover:text-indigo-600 transition-colors">
              {notes}
            </span>
          </Tooltip>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 48,
      render: () => (
        <Dropdown
          menu={{
            items: [
              { key: "edit", icon: <EditOutlined />, label: "Edit" },
              {
                key: "delete",
                icon: <DeleteOutlined />,
                label: "Delete",
                danger: true,
              },
            ],
          }}
          trigger={["click"]}
        >
          <Button
            type="text"
            icon={<MoreOutlined />}
            className="text-gray-400 hover:text-gray-700"
          />
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold text-gray-900 tracking-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Expenses
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Track and manage your store expenses
            </p>
          </div>
          <Space>
            <Button
              icon={<DownloadOutlined />}
              className="border-gray-200 text-gray-600 hover:border-indigo-400 hover:text-indigo-600"
            >
              Export
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalOpen(true)}
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
              }}
            >
              Add Expense
            </Button>
          </Space>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              title: "Total (Filtered)",
              value: totalAmount,
              prefix: "$",
              icon: <DollarOutlined className="text-indigo-500" />,
              bg: "bg-indigo-50",
            },
            {
              title: "This Month",
              value: thisMonthTotal,
              prefix: "$",
              icon: <CalendarOutlined className="text-emerald-500" />,
              bg: "bg-emerald-50",
              suffix:
                monthChange !== 0 ? (
                  <span
                    className={`text-xs font-semibold ml-2 ${
                      monthChange > 0 ? "text-red-500" : "text-emerald-500"
                    }`}
                  >
                    {monthChange > 0 ? (
                      <ArrowUpOutlined />
                    ) : (
                      <ArrowDownOutlined />
                    )}{" "}
                    {Math.abs(monthChange).toFixed(1)}%
                  </span>
                ) : null,
            },
            {
              title: "Total Records",
              value: filtered.length,
              icon: <ShopOutlined className="text-violet-500" />,
              bg: "bg-violet-50",
            },
          ].map((stat) => (
            <div
              key={stat.title}
              className="bg-white rounded-2xl border border-gray-100 px-6 py-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center text-xl`}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                  {stat.title}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xl font-bold text-gray-900">
                    {stat.prefix}
                    {typeof stat.value === "number"
                      ? stat.value.toLocaleString("en-US", {
                          minimumFractionDigits: stat.prefix === "$" ? 2 : 0,
                          maximumFractionDigits: stat.prefix === "$" ? 2 : 0,
                        })
                      : stat.value}
                  </span>
                  {stat.suffix}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-center">
            <Input
              prefix={<SearchOutlined className="text-gray-300" />}
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
              style={{ borderRadius: "10px" }}
            />
            <Select
              placeholder="Category"
              allowClear
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: 160, borderRadius: "10px" }}
              suffixIcon={<FilterOutlined className="text-gray-400" />}
            >
              {categories.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.name}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Payment Method"
              allowClear
              value={paymentFilter}
              onChange={setPaymentFilter}
              style={{ width: 170 }}
            >
              {Object.keys(PAYMENT_METHOD_COLORS).map((m) => (
                <Option key={m} value={m}>
                  {m.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </Option>
              ))}
            </Select>
            <RangePicker
              value={dateRange}
              onChange={(v) =>
                setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)
              }
              style={{ borderRadius: "10px" }}
            />
            {(search || categoryFilter || paymentFilter || dateRange) && (
              <Button
                type="text"
                size="small"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter(null);
                  setPaymentFilter(null);
                  setDateRange(null);
                }}
                className="text-gray-400 hover:text-red-500"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <Table
            columns={columns}
            dataSource={filtered}
            loading={loading || userLoading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => (
                <span className="text-gray-400 text-sm">{total} expenses</span>
              ),
              style: { padding: "12px 24px" },
            }}
            locale={{
              emptyText: (
                <Empty
                  description="No expenses found"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
            className="expense-table"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal
        title={
          <span className="text-lg font-bold text-gray-900">New Expense</span>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setIsModalOpen(false);
                form.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={() => {
                form
                  .validateFields()
                  .then(() => {
                    message.success("Expense added!");
                    setIsModalOpen(false);
                    form.resetFields();
                  })
                  .catch(() => {});
              }}
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
              }}
            >
              Save Expense
            </Button>
          </div>
        }
        width={520}
        style={{ borderRadius: "16px" }}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              name="title"
              label="Title"
              rules={[{ required: true, message: "Required" }]}
              className="col-span-2"
            >
              <Input
                placeholder="Expense title"
                style={{ borderRadius: "8px" }}
              />
            </Form.Item>
            <Form.Item
              name="amount"
              label="Amount"
              rules={[{ required: true, message: "Required" }]}
            >
              <InputNumber
                prefix="$"
                min={0}
                precision={2}
                className="w-full"
                style={{ borderRadius: "8px", width: "100%" }}
              />
            </Form.Item>
            <Form.Item
              name="expense_date"
              label="Date"
              rules={[{ required: true, message: "Required" }]}
            >
              <DatePicker
                className="w-full"
                style={{ borderRadius: "8px", width: "100%" }}
              />
            </Form.Item>
            <Form.Item name="category_id" label="Category">
              <Select
                placeholder="Select category"
                style={{ borderRadius: "8px" }}
              >
                {categories.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="payment_method" label="Payment Method">
              <Select placeholder="Payment method">
                {Object.keys(PAYMENT_METHOD_COLORS).map((m) => (
                  <Option key={m} value={m}>
                    {m
                      .replace("_", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="vendor_name" label="Vendor" className="col-span-2">
              <Input
                placeholder="Vendor name"
                style={{ borderRadius: "8px" }}
              />
            </Form.Item>
            <Form.Item name="notes" label="Notes" className="col-span-2">
              <Input.TextArea
                rows={3}
                placeholder="Additional notes..."
                style={{ borderRadius: "8px" }}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
