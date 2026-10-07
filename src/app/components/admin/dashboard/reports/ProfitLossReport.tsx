"use client";

import { useCallback, useEffect, useState } from "react";
import { DatePicker, Spin, Button, Popover, App } from "antd";
import dayjs, { Dayjs } from "dayjs";
import {
  TrendingUp,
  Package,
  DollarSign,
  Receipt,
  TrendingDown,
  Truck,
  Handshake,
  Download,
  Loader2,
  FileText,
  PlusCircle,
} from "lucide-react";
import { LockOutlined } from "@ant-design/icons";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { getProfitLossReport, ProfitLossReport as ProfitLossReportData } from "@/lib/queries/dashboard/getProfitLossReport";
import { useInvoiceData } from "@/lib/hook/useInvoiceData";
import { exportProfitLossReportPDF } from "@/lib/utils/exportProfitLossReport";
import ExportUpsell from "@/app/components/admin/common/ExportUpsell";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";
import ProfitTrendChart from "@/app/components/admin/dashboard/dashboardComponent/ProfitTrendChart";
import { MenuLabel } from "@/app/components/admin/common/MenuLabel";
import { ProfitStory } from "@/app/components/admin/dashboard/dashboardComponent/ProfitStory";
import { useBranches } from "@/lib/context/BranchContext";
import { useTranslation } from "@/lib/hook/useTranslation";

function StatTile({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "negative";
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 flex flex-col gap-2">
      <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div
        className={`text-xl font-black tabular-nums ${
          tone === "negative" ? "text-rose-600 dark:text-rose-400" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

const EMPTY: ProfitLossReportData = {
  salesAll: 0,
  toCollect: 0,
  totalSales: 0,
  additionalCharges: 0,
  cogs: 0,
  grossProfit: 0,
  totalExpenses: 0,
  deliveryNetCost: 0,
  vendorProfit: 0,
  netProfit: 0,
  trend: [],
};

export default function ProfitLossReport() {
  const { notification } = App.useApp();
  const { user } = useCurrentUser();
  const { icon: currencyIconRaw } = useUserCurrencyIcon();
  const currencyIcon = typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";

  const { allowed: exportAllowed } = useFeatureGate(user?.store_id, "export_data");
  const { loading: reportsFeatureLoading, allowed: profitLossAllowed } = useFeatureGate(
    user?.store_id,
    "profit_loss",
  );
  const { storeData } = useInvoiceData({ storeId: user?.store_id ?? undefined });
  const [exporting, setExporting] = useState(false);
  // Stores with branches: the header's branch, or the whole brand on "All branches".
  const { enabled: branchesOn, loading: branchesLoading, selectedBranchId, selectedBranch } = useBranches();
  const t = useTranslation();
  const reportBranchId = branchesOn ? selectedBranchId : null;
  const branchName = branchesOn ? (selectedBranch?.name ?? t.branches.allBranches) : null;

  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(89, "day"), dayjs()]);
  const [report, setReport] = useState<ProfitLossReportData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const fromDate = range[0].format("YYYY-MM-DD");
  const toDate = range[1].format("YYYY-MM-DD");

  const fetchReport = useCallback(async () => {
    if (!user?.store_id || branchesLoading) return;
    setLoading(true);
    try {
      const result = await getProfitLossReport(user.store_id, fromDate, toDate, reportBranchId);
      setReport(result);
    } finally {
      setLoading(false);
    }
  }, [user?.store_id, fromDate, toDate, reportBranchId, branchesLoading]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const money = (v: number) => `${currencyIcon}${v.toFixed(2)}`;

  const handleExportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportProfitLossReportPDF(report, {
        storeName: branchName
          ? `${storeData?.store_name ?? "Store"} — ${branchName}`
          : (storeData?.store_name ?? "Store"),
        fromDate,
        toDate,
        currencySymbol: currencyIcon,
      });
    } catch (error) {
      console.error("Profit & loss PDF export failed:", error);
      notification.error({
        title: "Export failed",
        description: "Could not generate the PDF file. Please try again.",
      });
    } finally {
      setExporting(false);
    }
  };

  if (reportsFeatureLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!profitLossAllowed) {
    return <FeatureLocked title={<MenuLabel labelKey="menuProfitLoss" />} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0">
              <TrendingUp size={18} color="white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground m-0 tracking-tight leading-tight">
                <MenuLabel labelKey="menuProfitLoss" />
              </h1>
              <p className="text-xs text-muted-foreground m-0">
                {branchName && <span className="font-semibold text-teal-700 dark:text-teal-300">{branchName} · </span>}
                Sales, cost of goods, expenses and net profit for any date range
              </p>
            </div>
          </div>

          <DatePicker.RangePicker format="DD-MM-YYYY"
            value={range}
            onChange={(v) => {
              if (v && v[0] && v[1]) setRange([v[0], v[1]]);
            }}
            allowClear={false}
            disabledDate={(d) => d.isAfter(dayjs(), "day")}
          />
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <ProfitStory
              periodLabel={`${range[0].format("DD-MM-YYYY")} – ${range[1].format("DD-MM-YYYY")}`}
              formatMoney={money}
              figures={{
                sales: report.totalSales,
                grossProfit: report.grossProfit,
                expenses: report.totalExpenses,
                vendorProfit: report.vendorProfit,
                netProfit: report.netProfit,
                netChangePct: null,
                deliveryCost: report.deliveryNetCost,
                allSales: report.salesAll,
              }}
            />

            <details className="group rounded-2xl border border-border/80 bg-card">
              <summary className="cursor-pointer select-none list-none px-4 py-3 text-sm font-semibold text-foreground flex items-center justify-between">
                {t.admin.psAllFigures}
                <span className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
              </summary>
              <div className="px-4 pb-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile
                icon={<DollarSign size={18} />}
                label={t.admin.psReceived}
                value={money(report.totalSales)}
                hint={t.admin.psReceivedTileHint}
              />
              <StatTile
                icon={<PlusCircle size={18} />}
                label="Additional Charges"
                value={money(report.additionalCharges)}
                hint="Included in Total Sales"
              />
              <StatTile icon={<Package size={18} />} label="COGS" value={money(report.cogs)} />
              <StatTile
                icon={<TrendingUp size={18} />}
                label="Gross Profit"
                value={money(report.grossProfit)}
              />
              <StatTile
                icon={<Receipt size={18} />}
                label="Total Expense"
                value={money(report.totalExpenses)}
              />
              <StatTile
                icon={<Truck size={18} />}
                label="Delivery Cost"
                value={money(report.deliveryNetCost)}
                hint={report.deliveryNetCost < 0 ? "Shipping charged covered more than cost" : undefined}
                tone={report.deliveryNetCost > 0 ? "negative" : "default"}
              />
              <StatTile
                icon={<Handshake size={18} />}
                label="Vendor Profit"
                value={money(report.vendorProfit)}
                hint="Profit share of vendor payments received"
              />
              <StatTile
                icon={<TrendingDown size={18} />}
                label="Net Profit"
                value={money(report.netProfit)}
                tone={report.netProfit < 0 ? "negative" : "default"}
              />
            </div>
              </div>
            </details>

            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
              <h2 className="text-sm font-bold text-foreground mb-3">Profit Overview</h2>
              <ProfitTrendChart data={report.trend} />
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
              <h2 className="text-sm font-bold text-foreground mb-1">Export Report</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Download your profit &amp; loss report
              </p>
              {exportAllowed ? (
                <Button
                  icon={exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  onClick={handleExportPdf}
                  disabled={exporting}
                  className="flex items-center gap-2"
                >
                  <FileText size={14} />
                  Download Details PDF
                </Button>
              ) : (
                <Popover
                  content={<ExportUpsell />}
                  trigger="click"
                  placement="bottomLeft"
                  styles={{ container: { padding: 12, borderRadius: 14 } }}
                >
                  <Button icon={<LockOutlined />} className="text-muted-foreground">
                    Download Details PDF
                  </Button>
                </Popover>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
