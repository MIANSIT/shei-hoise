"use client";

import { memo, useMemo, useState } from "react";
import { Select, Input, DatePicker, Button, Badge, Drawer } from "antd";
import {
  SearchOutlined,
  ClearOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { Tag, CreditCard } from "lucide-react";
import type { Dayjs } from "dayjs";
import type { ExpenseCategory } from "@/lib/types/expense/type";
import { PAYMENT_METHOD_CONFIG } from "@/lib/types/expense/expense-constants";
import {
  buildCategoryOptions,
  renderCategoryOption,
} from "./CategorySelectOptions";

const { RangePicker } = DatePicker;

interface ExpenseFiltersProps {
  search: string;
  categoryFilter: string | null;
  paymentFilter: string | null;
  dateRange: [Dayjs, Dayjs] | null;
  categories: ExpenseCategory[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onPaymentChange: (value: string | null) => void;
  onDateRangeChange: (value: [Dayjs, Dayjs] | null) => void;
  onClear: () => void;
}

const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD_CONFIG).map(
  ([key, cfg]) => ({
    value: key,
    label: cfg.label,
    color: cfg.color,
  }),
);

// Shared filter controls — reused in both inline and drawer layouts
function FilterControls({
  search,
  categoryFilter,
  paymentFilter,
  dateRange,
  categories,
  onSearchChange,
  onCategoryChange,
  onPaymentChange,
  onDateRangeChange,
  onClear,
  activeCount,
  vertical = false,
}: ExpenseFiltersProps & { activeCount: number; vertical?: boolean }) {
  const categoryOptions = useMemo(
    () => buildCategoryOptions(categories),
    [categories],
  );

  return (
    <div
      className={`flex ${vertical ? "flex-col" : "flex-wrap"} gap-2.5 items-${vertical ? "stretch" : "center"}`}
    >
      <Input
        prefix={<SearchOutlined style={{ color: "#d1d5db", fontSize: 13 }} />}
        placeholder="Search title, vendor..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className={vertical ? "w-full" : ""}
        style={{ width: vertical ? "100%" : 220, borderRadius: 10, height: 36 }}
        allowClear
      />

      <Select
        placeholder={
          <span className="flex items-center gap-1.5">
            <Tag size={12} color="#9ca3af" strokeWidth={2} />
            <span>Category</span>
          </span>
        }
        allowClear
        value={categoryFilter ?? undefined}
        onChange={(v) => onCategoryChange(v ?? null)}
        style={{ width: vertical ? "100%" : 190, minWidth: 0 }}
        options={categoryOptions}
        optionRender={renderCategoryOption}
      />

      <Select
        placeholder={
          <span className="flex items-center gap-1.5">
            <CreditCard size={12} color="#9ca3af" strokeWidth={2} />
            <span>Payment</span>
          </span>
        }
        allowClear
        value={paymentFilter ?? undefined}
        onChange={(v) => onPaymentChange(v ?? null)}
        style={{ width: vertical ? "100%" : 160, minWidth: 0 }}
        options={PAYMENT_OPTIONS}
        optionRender={(option) => (
          <span
            style={{
              color: (option.data as { color: string }).color,
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            {option.label}
          </span>
        )}
      />

      <RangePicker
        value={dateRange}
        onChange={(v) => onDateRangeChange(v as [Dayjs, Dayjs] | null)}
        style={{
          borderRadius: 10,
          height: 36,
          width: vertical ? "100%" : undefined,
        }}
      />

      {activeCount > 0 && (
        <Button
          type="text"
          size="small"
          icon={<ClearOutlined />}
          onClick={onClear}
          className="text-red-500 hover:text-red-600 flex items-center gap-1 h-8 rounded-lg"
        >
          Clear {activeCount > 0 && `(${activeCount})`}
        </Button>
      )}
    </div>
  );
}

function ExpenseFilters(props: ExpenseFiltersProps) {
  const { search, categoryFilter, paymentFilter, dateRange } = props;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeCount = [search, categoryFilter, paymentFilter, dateRange].filter(
    Boolean,
  ).length;

  return (
    <>
      {/* ── Desktop: inline bar ── */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-5 py-3.5 shadow-sm">
        <FilterControls {...props} activeCount={activeCount} />
      </div>

      {/* ── Mobile: trigger button + drawer ── */}
      <div className="flex md:hidden gap-2">
        <div className="flex-1">
          <Input
            prefix={
              <SearchOutlined style={{ color: "#d1d5db", fontSize: 13 }} />
            }
            placeholder="Search..."
            value={search}
            onChange={(e) => props.onSearchChange(e.target.value)}
            style={{ borderRadius: 10, height: 38, width: "100%" }}
            allowClear
          />
        </div>
        <Button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 h-9.5 rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          icon={<FilterOutlined />}
        >
          Filters
          {activeCount > 0 && (
            <Badge
              count={activeCount}
              size="small"
              style={{
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                marginLeft: 2,
              }}
            />
          )}
        </Button>
      </div>

      {/* ── Mobile drawer ── */}
      <Drawer
        title={
          <span className="font-semibold text-gray-800 dark:text-white">
            Filter Expenses
          </span>
        }
        placement="bottom"
        size="auto"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{
          body: { paddingBottom: 32 },
          header: { borderBottom: "1px solid #f0f0f5" },
        }}
        className="dark:bg-gray-800"
      >
        <FilterControls {...props} activeCount={activeCount} vertical />
        <Button
          type="primary"
          block
          className="mt-4 h-11 rounded-xl font-semibold"
          style={{
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            border: "none",
          }}
          onClick={() => setDrawerOpen(false)}
        >
          Apply Filters
        </Button>
      </Drawer>
    </>
  );
}

export default memo(ExpenseFilters);
