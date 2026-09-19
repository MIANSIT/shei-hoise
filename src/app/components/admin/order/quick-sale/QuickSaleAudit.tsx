"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, DatePicker, Table, Typography, InputNumber, Tag, Spin } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import {
  getQuickSaleDailySummary,
  QuickSaleDailySummary,
  QuickSaleDailyOrderRow,
} from "@/lib/queries/orders/getQuickSaleDailySummary";
import { getRegisterOpeningCash } from "@/lib/queries/orders/registerOpeningCash";
import { setRegisterOpeningCash } from "@/lib/queries/orders/setRegisterOpeningCash";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { PAYMENT_LABELS } from "@/lib/utils/paymentLabels";
import StatusTag from "@/app/components/admin/order/allOrder/StatusFilter/StatusTag";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";

const { Text, Title } = Typography;

const EMPTY_SUMMARY: QuickSaleDailySummary = {
  transactionCount: 0,
  grossSales: 0,
  collectedByMethod: {},
  dueOutstanding: 0,
  dueCollectedToday: 0,
  codCashSettled: 0,
  orders: [],
};

const methodLabel = (method: string) => PAYMENT_LABELS[method] || method;

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "success"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-foreground";
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-4 flex flex-col gap-1 min-w-0">
      <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
      <span className={`text-xl font-bold truncate ${toneClass}`}>{value}</span>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

export default function QuickSaleAudit() {
  const { user } = useCurrentUser();
  const { loading: posFeatureLoading, allowed: posAllowed } = useFeatureGate(
    user?.store_id,
    "pos",
  );
  const { icon: currencyIconRaw, loading: currencyLoading } = useUserCurrencyIcon();
  const currencyIcon =
    !currencyLoading && typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";
  const money = (v: number) => `${currencyIcon}${v.toFixed(2)}`;
  const { success, error } = useSheiNotification();

  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [summary, setSummary] = useState<QuickSaleDailySummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [countedCash, setCountedCash] = useState<number | null>(null);

  // Opening cash is saved (unlike countedCash below) — it's the actual float
  // the drawer started with, not a one-time spot check, so it needs to
  // survive a reload and be visible to whoever's checking the audit later.
  const [openingCash, setOpeningCash] = useState<number | null>(null);
  const [openingCashDraft, setOpeningCashDraft] = useState<number | null>(null);
  const [openingCashLoading, setOpeningCashLoading] = useState(true);
  const [savingOpeningCash, setSavingOpeningCash] = useState(false);

  const dateStr = selectedDate.format("YYYY-MM-DD");

  const fetchSummary = useCallback(async () => {
    if (!user?.store_id) return;
    setLoading(true);
    try {
      const result = await getQuickSaleDailySummary(user.store_id, dateStr);
      setSummary(result);
    } finally {
      setLoading(false);
    }
  }, [user?.store_id, dateStr]);

  const fetchOpeningCash = useCallback(async () => {
    if (!user?.store_id) return;
    setOpeningCashLoading(true);
    try {
      const result = await getRegisterOpeningCash(user.store_id, dateStr);
      setOpeningCash(result);
      setOpeningCashDraft(result);
    } finally {
      setOpeningCashLoading(false);
    }
  }, [user?.store_id, dateStr]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchOpeningCash();
  }, [fetchOpeningCash]);

  // The cash count is a per-visit spot check, not a saved record — it
  // shouldn't carry over when the cashier switches to a different day.
  useEffect(() => {
    setCountedCash(null);
  }, [dateStr]);

  const handleSaveOpeningCash = async () => {
    if (!user?.store_id || openingCashDraft == null) return;
    setSavingOpeningCash(true);
    try {
      await setRegisterOpeningCash(dateStr, openingCashDraft);
      setOpeningCash(openingCashDraft);
      success("Opening cash saved");
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to save opening cash");
    } finally {
      setSavingOpeningCash(false);
    }
  };

  // Cash on hand for the day also includes whatever float the drawer
  // started with, plus any COD payout a courier handed over today (see
  // codCashSettled's doc comment) — not just cash-method Quick
  // Sale/online transactions.
  const cashExpected =
    (openingCash ?? 0) + (summary.collectedByMethod["cash"] ?? 0) + summary.codCashSettled;
  const variance = countedCash != null ? countedCash - cashExpected : null;

  const columns: ColumnsType<QuickSaleDailyOrderRow> = [
    {
      title: "Time",
      key: "time",
      width: 90,
      render: (_, row) => dayjs(row.created_at).format("h:mm A"),
    },
    {
      title: "Order #",
      dataIndex: "order_number",
      key: "order_number",
      render: (v: string) => <span className="font-medium">#{v}</span>,
    },
    {
      title: "Customer",
      key: "customer",
      render: (_, row) => (
        <div className="min-w-0">
          <div className="text-sm truncate max-w-40">{row.customer_name}</div>
          {row.customer_phone && (
            <div className="text-xs text-muted-foreground truncate max-w-40">
              {row.customer_phone}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Method",
      dataIndex: "payment_method",
      key: "payment_method",
      render: (v: string | null) => (v ? methodLabel(v) : "—"),
    },
    {
      title: "Total",
      key: "total",
      align: "right" as const,
      render: (_, row) => money(row.total_amount),
    },
    {
      title: "Due",
      key: "due",
      align: "right" as const,
      render: (_, row) =>
        row.due_remaining > 0.01 ? (
          <Text type="danger">{money(row.due_remaining)}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, row) => <StatusTag status={row.status} size="small" />,
    },
  ];

  if (posFeatureLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Spin size="large" />
      </div>
    );
  }

  if (!posAllowed) {
    return <FeatureLocked title="Register Audit" />;
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Register Audit
          </Title>
          <Text type="secondary" className="text-xs">
            End-of-shift cash count for the day&apos;s sales — online and in-store.
          </Text>
        </div>
        <DatePicker
          value={selectedDate}
          onChange={(d) => d && setSelectedDate(d)}
          allowClear={false}
          disabledDate={(d) => d.isAfter(dayjs(), "day")}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Transactions" value={`${summary.transactionCount}`} />
            <StatCard
              label="Gross Sales"
              value={money(summary.grossSales)}
              hint="Excludes shipping & tax"
            />
            <StatCard
              label="Due Outstanding (today's sales)"
              value={money(summary.dueOutstanding)}
              tone={summary.dueOutstanding > 0.01 ? "warning" : "default"}
            />
            <StatCard
              label="Due Collected Today (all sources)"
              value={money(summary.dueCollectedToday + summary.codCashSettled)}
              hint={summary.codCashSettled > 0 ? "Includes COD settlements" : undefined}
            />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/50 p-4 space-y-3">
            <Text strong className="text-sm">
              Collected by payment method
            </Text>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.keys(summary.collectedByMethod).length === 0 &&
              summary.codCashSettled === 0 ? (
                <Text type="secondary" className="text-sm col-span-full">
                  Nothing collected on this day.
                </Text>
              ) : (
                <>
                  {Object.entries(summary.collectedByMethod).map(([method, amount]) => (
                    <StatCard key={method} label={methodLabel(method)} value={money(amount)} />
                  ))}
                  {summary.codCashSettled > 0 && (
                    <StatCard
                      label={methodLabel("cod")}
                      value={money(summary.codCashSettled)}
                      hint="Handed over by courier"
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Text strong className="text-sm">
                Cash drawer count
              </Text>
              <Link href="/dashboard/cod-settlements" className="text-xs">
                Record a COD settlement →
              </Link>
            </div>
            {summary.codCashSettled > 0 && (
              <Text type="secondary" className="text-xs block -mt-1">
                Includes {money(summary.codCashSettled)} COD cash settled by a courier today.
              </Text>
            )}
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Opening cash (Day Start)</div>
                <div className="flex items-center gap-2">
                  <InputNumber
                    min={0}
                    value={openingCashDraft}
                    onChange={(v) => setOpeningCashDraft(v)}
                    disabled={openingCashLoading}
                    placeholder="0.00"
                    style={{ width: 120 }}
                  />
                  {openingCashDraft !== openingCash && (
                    <Button
                      type="link"
                      size="small"
                      className="p-0 h-auto text-xs"
                      loading={savingOpeningCash}
                      onClick={handleSaveOpeningCash}
                    >
                      Save
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Expected cash</div>
                <div className="text-lg font-bold">{money(cashExpected)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Counted cash</div>
                <InputNumber
                  min={0}
                  value={countedCash}
                  onChange={(v) => setCountedCash(v)}
                  placeholder="0.00"
                  style={{ width: "100%", maxWidth: 140 }}
                />
              </div>
              {variance != null && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Variance</div>
                  <Tag color={Math.abs(variance) <= 0.01 ? "green" : variance > 0 ? "blue" : "red"}>
                    {Math.abs(variance) <= 0.01
                      ? "Balanced"
                      : variance > 0
                        ? `Over by ${money(variance)}`
                        : `Short by ${money(Math.abs(variance))}`}
                  </Tag>
                </div>
              )}
            </div>
            <Text type="secondary" className="text-xs">
              This count isn&apos;t saved — it&apos;s a one-time check against what the system expects
              for this day.
            </Text>
          </div>

          <Table<QuickSaleDailyOrderRow>
            columns={columns}
            dataSource={summary.orders}
            rowKey="id"
            pagination={false}
            size="small"
            scroll={{ x: 700 }}
            locale={{ emptyText: "No transactions on this day." }}
          />
        </>
      )}
    </div>
  );
}
