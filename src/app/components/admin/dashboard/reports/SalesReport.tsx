"use client";

import { useCallback, useEffect, useState } from "react";
import { DatePicker, Table, Spin, Dropdown, Button, Popover, App } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { BarChart2, ShoppingBag, Store, Smartphone, Download, Loader2 } from "lucide-react";
import { LockOutlined } from "@ant-design/icons";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import {
  getSalesReport,
  getSalesReportOrdersForPeriod,
  SalesReportOrderRow,
  SalesReportResult,
  SalesReportRow,
} from "@/lib/queries/orders/getSalesReport";
import ExportUpsell from "@/app/components/admin/common/ExportUpsell";
import { useInvoiceData } from "@/lib/hook/useInvoiceData";
import {
  exportSalesReportCSV,
  exportSalesReportPDF,
  exportSalesReportXLSX,
  SalesReportMeta,
} from "@/lib/utils/exportSalesReport";

type Granularity = "day" | "week" | "month" | "year" | "custom";

const GRANULARITY_OPTIONS: { key: Granularity; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "custom", label: "Custom Range" },
];

// A range longer than this switches the table to monthly buckets instead of
// daily — otherwise a multi-year custom range would render hundreds of rows.
const CUSTOM_RANGE_DAILY_LIMIT = 62;

function computeRange(
  granularity: Exclude<Granularity, "custom">,
  date: Dayjs,
): { fromDate: string; toDate: string; bucket: "day" | "month" } {
  if (granularity === "day") {
    const d = date.format("YYYY-MM-DD");
    return { fromDate: d, toDate: d, bucket: "day" };
  }
  if (granularity === "week") {
    // Monday-start week, independent of dayjs' locale-dependent default.
    const dow = date.day(); // 0 = Sunday .. 6 = Saturday
    const diffToMonday = (dow + 6) % 7;
    const start = date.subtract(diffToMonday, "day");
    const end = start.add(6, "day");
    return { fromDate: start.format("YYYY-MM-DD"), toDate: end.format("YYYY-MM-DD"), bucket: "day" };
  }
  if (granularity === "month") {
    return {
      fromDate: date.startOf("month").format("YYYY-MM-DD"),
      toDate: date.endOf("month").format("YYYY-MM-DD"),
      bucket: "day",
    };
  }
  return {
    fromDate: date.startOf("year").format("YYYY-MM-DD"),
    toDate: date.endOf("year").format("YYYY-MM-DD"),
    bucket: "month",
  };
}

function getRowDateRange(row: SalesReportRow, bucket: "day" | "month"): { fromDate: string; toDate: string } {
  if (bucket === "day") {
    return { fromDate: row.period_key, toDate: row.period_key };
  }
  const start = dayjs(`${row.period_key}-01`);
  return { fromDate: start.format("YYYY-MM-DD"), toDate: start.endOf("month").format("YYYY-MM-DD") };
}

// Expand-row drill-down — answers "which orders make up this number" by
// lazily fetching the individual orders behind one aggregated report row.
function PeriodOrdersDrilldown({
  storeId,
  fromDate,
  toDate,
  currencyIcon,
}: {
  storeId?: string | null;
  fromDate: string;
  toDate: string;
  currencyIcon: string;
}) {
  const [orders, setOrders] = useState<SalesReportOrderRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!storeId) return;
    setOrders(null);
    getSalesReportOrdersForPeriod(storeId, fromDate, toDate).then((rows) => {
      if (!cancelled) setOrders(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [storeId, fromDate, toDate]);

  if (orders === null) {
    return (
      <div className="py-4 flex justify-center">
        <Spin size="small" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-4 text-xs text-muted-foreground text-center">
        No orders found for this period
      </div>
    );
  }

  return (
    <div className="py-2 px-1">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
        {orders.length} order{orders.length !== 1 ? "s" : ""} in this period
      </div>
      <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
        <table className="w-full text-xs min-w-105">
          <thead>
            <tr className="bg-muted/60 text-muted-foreground">
              <th className="text-left px-3 py-2 font-semibold">Order #</th>
              <th className="text-left px-3 py-2 font-semibold">Customer</th>
              <th className="text-left px-3 py-2 font-semibold">Channel</th>
              <th className="text-right px-3 py-2 font-semibold">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.order_number} className="border-t border-border">
                <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">#{o.order_number}</td>
                <td className="px-3 py-2 text-muted-foreground">{o.customer_name}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                      o.channel === "pos"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                    }`}
                  >
                    {o.channel === "pos" ? "Quick Sale" : "Online"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-semibold text-foreground whitespace-nowrap">
                  {currencyIcon}
                  {o.revenue.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 flex flex-col gap-2">
      <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="text-xl font-black tabular-nums text-foreground">{value}</div>
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default function SalesReport() {
  const { notification } = App.useApp();
  const { user } = useCurrentUser();
  const { icon: currencyIconRaw } = useUserCurrencyIcon();
  const currencyIcon = typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";

  const { allowed: exportAllowed } = useFeatureGate(user?.store_id, "export_data");
  const { storeData } = useInvoiceData({ storeId: user?.store_id ?? undefined });
  const [exportingFormat, setExportingFormat] = useState<"pdf" | "xlsx" | "csv" | null>(null);

  const [granularity, setGranularity] = useState<Granularity>("month");
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(29, "day"),
    dayjs(),
  ]);
  const [report, setReport] = useState<SalesReportResult | null>(null);
  const [loading, setLoading] = useState(true);

  const { fromDate, toDate, bucket } =
    granularity === "custom"
      ? {
          fromDate: customRange[0].format("YYYY-MM-DD"),
          toDate: customRange[1].format("YYYY-MM-DD"),
          bucket:
            customRange[1].diff(customRange[0], "day") > CUSTOM_RANGE_DAILY_LIMIT
              ? ("month" as const)
              : ("day" as const),
        }
      : computeRange(granularity, selectedDate);

  const fetchReport = useCallback(async () => {
    if (!user?.store_id) return;
    setLoading(true);
    try {
      const result = await getSalesReport(user.store_id, fromDate, toDate, bucket);
      setReport(result);
    } finally {
      setLoading(false);
    }
  }, [user?.store_id, fromDate, toDate, bucket]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = async (format: "pdf" | "xlsx" | "csv") => {
    if (!report || exportingFormat) return;

    const meta: SalesReportMeta = {
      storeName: storeData?.store_name ?? "Store",
      fromDate,
      toDate,
      granularityLabel:
        granularity === "custom"
          ? `Custom (${fromDate} to ${toDate})`
          : (GRANULARITY_OPTIONS.find((g) => g.key === granularity)?.label ?? granularity),
      currencySymbol: currencyIcon,
    };

    setExportingFormat(format);
    try {
      if (format === "csv") {
        exportSalesReportCSV(report, meta);
      } else if (format === "xlsx") {
        await exportSalesReportXLSX(report, meta, storeData?.logo_url);
      } else {
        await exportSalesReportPDF(report, meta, bucket, storeData?.logo_url);
      }
    } catch (error) {
      console.error(`Sales report ${format} export failed:`, error);
      notification.error({
        title: "Export failed",
        description: `Could not generate the ${format.toUpperCase()} file. Please try again.`,
      });
    } finally {
      setExportingFormat(null);
    }
  };

  const money = (v: number) => `${currencyIcon}${v.toFixed(2)}`;

  const pickerType = granularity === "day" || granularity === "custom" ? "date" : granularity;

  const columns = [
    {
      title: bucket === "month" ? "Month" : "Date",
      dataIndex: "period_label",
      key: "period_label",
    },
    {
      title: "Orders",
      dataIndex: "orders_count",
      key: "orders_count",
      align: "right" as const,
    },
    {
      title: "Revenue",
      dataIndex: "revenue",
      key: "revenue",
      align: "right" as const,
      render: (v: number) => <span className="font-semibold">{money(v)}</span>,
    },
    {
      title: "Online",
      dataIndex: "online_revenue",
      key: "online_revenue",
      align: "right" as const,
      render: (v: number) => money(v),
    },
    {
      title: "Quick Sale",
      dataIndex: "pos_revenue",
      key: "pos_revenue",
      align: "right" as const,
      render: (v: number) => money(v),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-400 to-purple-600 flex items-center justify-center shrink-0">
              <BarChart2 size={18} color="white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground m-0 tracking-tight leading-tight">
                Sales Report
              </h1>
              <p className="text-xs text-muted-foreground m-0">
                Track sales by day, week, month, year, or a custom range — online vs. Quick Sale
              </p>
            </div>
          </div>

          {exportAllowed ? (
            <Dropdown
              menu={{
                items: [
                  { key: "pdf", label: "Download as PDF", onClick: () => handleExport("pdf") },
                  { key: "xlsx", label: "Download as Excel", onClick: () => handleExport("xlsx") },
                  { key: "csv", label: "Download as CSV", onClick: () => handleExport("csv") },
                ],
                disabled: !!exportingFormat || loading || !report,
              }}
              trigger={["click"]}
            >
              <Button
                type="primary"
                icon={
                  exportingFormat ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )
                }
                loading={false}
              >
                Download
              </Button>
            </Dropdown>
          ) : (
            <Popover
              content={<ExportUpsell />}
              trigger="click"
              placement="bottomRight"
              styles={{ container: { padding: 12, borderRadius: 14 } }}
            >
              <Button icon={<LockOutlined />} className="text-muted-foreground">
                Download
              </Button>
            </Popover>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-xl p-1 gap-0.5 bg-muted border border-border">
            {GRANULARITY_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setGranularity(key);
                  if (key !== "custom") setSelectedDate(dayjs());
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  granularity === key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {granularity === "custom" ? (
            <DatePicker.RangePicker
              value={customRange}
              onChange={(range) => {
                if (range && range[0] && range[1]) {
                  setCustomRange([range[0], range[1]]);
                }
              }}
              allowClear={false}
            />
          ) : (
            <DatePicker
              picker={pickerType}
              value={selectedDate}
              onChange={(d) => d && setSelectedDate(d)}
              allowClear={false}
            />
          )}
        </div>

        {loading || !report ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <div className="space-y-5 bg-background">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile
                icon={<BarChart2 size={18} />}
                label="Total Sales"
                value={money(report.totalRevenue)}
                hint="Excludes shipping & tax"
              />
              <StatTile
                icon={<ShoppingBag size={18} />}
                label="Orders"
                value={String(report.totalOrders)}
              />
              <StatTile
                icon={<Smartphone size={18} />}
                label="Online Sales"
                value={money(report.onlineRevenue)}
              />
              <StatTile
                icon={<Store size={18} />}
                label="Quick Sale (POS)"
                value={money(report.posRevenue)}
              />
            </div>

            <Table<SalesReportRow>
              columns={columns}
              dataSource={report.rows}
              rowKey="period_key"
              pagination={false}
              locale={{ emptyText: "No sales in this period" }}
              expandable={{
                expandedRowRender: (row) => {
                  const { fromDate: rowFromDate, toDate: rowToDate } = getRowDateRange(row, bucket);
                  return (
                    <PeriodOrdersDrilldown
                      storeId={user?.store_id}
                      fromDate={rowFromDate}
                      toDate={rowToDate}
                      currencyIcon={currencyIcon}
                    />
                  );
                },
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
