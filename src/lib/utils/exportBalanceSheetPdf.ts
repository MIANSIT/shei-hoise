import dayjs from "dayjs";
import type { AccrualStatementsData } from "@/lib/hook/useAccrualStatements";
import { computeMargins, netMarginPct } from "@/lib/utils/profitMargins";
import { enableBengaliText } from "@/lib/pdf/bengaliPdfText";
import { loadBengaliFontBrowser } from "@/lib/pdf/bengaliFontBrowser";
import { applyBengaliFontBrowser, hasBengaliChar, registerBengaliFontBrowser } from "@/lib/utils/exportProfitLossReport";

export interface BalanceSheetPdfInput {
  storeName: string;
  /** The branch the figures are for, or null for the whole store. */
  scopeLabel: string | null;
  data: AccrualStatementsData;
  /** Margin made on vendor sales, part of net profit. */
  vendorProfit: number;
  /** The Profit & Loss period, for example "Last 30 days" or "01-10-2026 – 31-10-2026". */
  periodLabel: string;
  /** What the balance is "as of", for example "05-11-2026" or "End of October 2026". */
  balanceAsOf: string;
  /** A note under the header: an estimate, a saved copy, a closed month. */
  notice?: string | null;
  currencySymbol: string;
  /** A branch view: the supplier bills line says whose bills it counts. */
  branchView: boolean;
}

type Rgb = [number, number, number];

const TEAL: Rgb = [15, 118, 110];
const ORANGE: Rgb = [194, 65, 12];
const RED: Rgb = [220, 38, 38];
const GREEN: Rgb = [5, 150, 105];
const DARK: Rgb = [31, 41, 55];
const MUTED: Rgb = [107, 114, 128];

type Kind = "heading" | "plain" | "sub" | "total" | "final";
interface Line {
  kind: Kind;
  label: string;
  note?: string;
  /** Null for a heading. */
  value: number | null;
  /** Shown as a cost with a minus sign. */
  cost?: boolean;
  /** The amount cannot be shown to this person (supplier money is hidden from some staff). */
  hidden?: boolean;
}

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  mobile_banking: "Mobile banking (bKash, Nagad)",
  card: "Bank / Card",
  bank_transfer: "Bank / Card",
  online: "Online payment",
  other: "Other / not recorded",
};

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "") || "store";
}

/**
 * The Balance Sheet and the Profit & Loss as a proper A4 document: a header with the store, the branch and the
 * dates, each statement as a table (line, how it is worked out, amount), then page numbers. It uses the same
 * figures as the Balance Sheet page, so the two always agree.
 */
export async function exportBalanceSheetPDF(input: BalanceSheetPdfInput): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  enableBengaliText(pdf, await loadBengaliFontBrowser());
  const bengaliLoaded = await registerBengaliFontBrowser(pdf);
  pdf.setFont("helvetica");

  const { data, vendorProfit, currencySymbol } = input;
  const { pl, balance, vendorDue, cash } = data;
  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const money = (v: number) => `${v < 0 ? "-" : ""}${currencySymbol}${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const textWithFont = (text: string, x: number, y: number, opts?: { align?: "right" | "center" }) => {
    applyBengaliFontBrowser(pdf, text, bengaliLoaded);
    pdf.text(text, x, y, opts);
  };

  // ── Header band ──
  const bandHeight = 32;
  pdf.setFillColor(...TEAL);
  pdf.rect(0, 0, pageWidth, bandHeight, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  textWithFont(input.storeName, margin, 13);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(204, 251, 241);
  pdf.text("Balance Sheet and Profit & Loss", margin, 20);
  pdf.setFontSize(8.5);
  pdf.text(input.scopeLabel ? `Branch: ${input.scopeLabel}` : "All branches", pageWidth - margin, 13, { align: "right" });
  pdf.text(`Generated ${dayjs().format("DD-MM-YYYY, HH:mm")}`, pageWidth - margin, 20, { align: "right" });
  pdf.text(`Balance as of ${input.balanceAsOf}  ·  Profit & Loss: ${input.periodLabel}`, margin, 27);

  let y = bandHeight + 6;
  if (input.notice) {
    pdf.setFillColor(254, 249, 195);
    pdf.setDrawColor(202, 138, 4);
    pdf.roundedRect(margin, y, contentWidth, 11, 2, 2, "FD");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(113, 63, 18);
    const wrapped = pdf.splitTextToSize(input.notice, contentWidth - 8) as string[];
    textWithFont(wrapped[0] ?? "", margin + 4, y + 4.5);
    if (wrapped[1]) textWithFont(wrapped[1], margin + 4, y + 8.5);
    y += 16;
  }

  const table = (title: string, subtitle: string, accent: Rgb, lines: Line[]) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...accent);
    pdf.text(title, margin, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...MUTED);
    pdf.text(subtitle, margin, y + 5);

    autoTable(pdf, {
      startY: y + 8,
      head: [["", "How it is worked out", "Amount"]],
      body: lines.map((l) => [
        l.kind === "sub" ? `   ${l.label}` : l.label,
        l.note ?? "",
        l.value === null ? "" : l.hidden ? "—" : l.cost ? `-${currencySymbol}${Math.abs(l.value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : money(l.value),
      ]),
      theme: "plain",
      styles: { fontSize: 9.5, cellPadding: { top: 2.6, bottom: 2.6, left: 2, right: 2 }, font: "helvetica", textColor: DARK },
      headStyles: { fillColor: accent, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 62 },
        1: { textColor: MUTED, fontSize: 8 },
        2: { cellWidth: 36, halign: "right", fontStyle: "bold" },
      },
      didParseCell: (cell) => {
        if (cell.section !== "body") return;
        const line = lines[cell.row.index];
        if (line.kind === "heading") {
          cell.cell.styles.fillColor = [243, 244, 246];
          cell.cell.styles.fontStyle = "bold";
          cell.cell.styles.fontSize = 8;
          cell.cell.styles.textColor = MUTED;
        }
        if (line.kind === "plain" && cell.column.index === 0) cell.cell.styles.fontStyle = "bold";
        if (line.kind === "sub") {
          cell.cell.styles.fontSize = 9;
          if (cell.column.index === 2) cell.cell.styles.fontStyle = "normal";
        }
        if (line.kind === "total") {
          cell.cell.styles.fontStyle = "bold";
          cell.cell.styles.fillColor = [240, 253, 250];
        }
        if (line.kind === "final") {
          cell.cell.styles.fontStyle = "bold";
          cell.cell.styles.fontSize = 11;
          cell.cell.styles.fillColor = [236, 253, 245];
          if (cell.column.index === 2) cell.cell.styles.textColor = line.value !== null && line.value < 0 ? RED : GREEN;
        }
        if (line.cost && cell.column.index === 2) cell.cell.styles.textColor = RED;
        const text = String(cell.cell.raw ?? "");
        if (bengaliLoaded && hasBengaliChar(text)) {
          cell.cell.styles.font = "NotoSansBengali";
          cell.cell.styles.fontStyle = "normal";
        }
      },
      margin: { left: margin, right: margin, bottom: 18 },
    });
    y = ((pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10;
  };

  // ── Balance Sheet ──
  const receivable = balance.customerDue + balance.codWithCourier + vendorDue;
  const cashTotal = cash?.total ?? 0;
  const fixedAssets = cash?.fixedAssets ?? 0;
  const loans = cash?.loans ?? 0;
  const investorAccount = cash?.investorAccount ?? 0;
  const advance = balance.supplierAdvance;
  const totalAssets = cashTotal + investorAccount + fixedAssets + balance.inventoryAtCost + receivable + advance;
  const payable = balance.accountsPayable;
  const totalLiabilities = payable === null ? null : payable + loans;
  const netPosition = totalLiabilities === null ? null : totalAssets - totalLiabilities;
  const workingCapital = payable === null ? null : cashTotal + investorAccount + balance.inventoryAtCost + receivable + advance - payable;

  const balanceLines: Line[] = [
    { kind: "heading", label: "ASSETS: WHAT THE BUSINESS OWNS", value: null },
    ...(cash
      ? ([
          { kind: "plain", label: "Business cash", note: "Starting cash plus sales received, less spending, by payment method", value: cash.total },
          ...cash.methods.map((m) => ({ kind: "sub" as const, label: METHOD_LABEL[m.method] ?? m.method, value: m.left })),
        ] as Line[])
      : []),
    ...(investorAccount > 0.005 ? ([{ kind: "plain", label: "Investor account", note: "Money people put in that has not been spent or paid back", value: investorAccount }] as Line[]) : []),
    {
      kind: "plain",
      label: "Inventory (at cost)",
      note: `${Math.round(balance.inventoryUnits).toLocaleString("en-US")} units at what you paid. At selling price: ${Math.round(balance.inventoryAtSelling).toLocaleString("en-US")}`,
      value: balance.inventoryAtCost,
    },
    { kind: "plain", label: "Accounts receivable", note: "Money owed to you", value: receivable },
    { kind: "sub", label: "Customers owe you", note: "Unpaid orders and dues, after payments", value: balance.customerDue },
    { kind: "sub", label: "COD held by couriers", note: "Delivered orders the courier has not paid out yet", value: balance.codWithCourier },
    { kind: "sub", label: "Vendors owe you", note: "Goods sent to vendors minus their payments", value: vendorDue },
    ...(advance > 0.005 ? ([{ kind: "plain", label: "Paid ahead to suppliers", note: "Paid to a supplier above its bills", value: advance }] as Line[]) : []),
    ...(fixedAssets > 0.005 ? ([{ kind: "plain", label: "Equipment", note: "Bought for the business and still in use", value: fixedAssets }] as Line[]) : []),
    { kind: "total", label: cash ? "Total assets" : "Total assets (without cash & bank)", value: totalAssets },
    { kind: "heading", label: "LIABILITIES: WHAT THE BUSINESS OWES", value: null },
    {
      kind: "plain",
      label: "Accounts payable",
      note:
        payable === null
          ? "Not shown for this person"
          : input.branchView
            ? balance.payableByBranch
              ? "Supplier bills minus payments, for the goods this branch received"
              : "Supplier bills minus payments, for the whole store"
            : "Supplier bills minus payments to suppliers",
      value: payable ?? 0,
      hidden: payable === null,
    },
    ...(loans > 0.005 ? ([{ kind: "plain", label: "Investor loans", note: "Money people lent the business and has not been repaid", value: loans }] as Line[]) : []),
    ...(cash && totalLiabilities !== null ? ([{ kind: "total", label: "Total liabilities", value: totalLiabilities }] as Line[]) : []),
    ...(netPosition !== null
      ? ([
          {
            kind: "final",
            label: cash ? "Owner's equity" : "Net position (without cash & bank)",
            note: cash ? "Total assets minus total liabilities" : "Total assets minus accounts payable. Cash and bank are not counted yet",
            value: netPosition,
          },
        ] as Line[])
      : []),
    ...(cash && workingCapital !== null
      ? ([{ kind: "plain", label: "Net working capital", note: "Cash, stock, money owed to you and paid ahead, minus accounts payable", value: workingCapital }] as Line[])
      : []),
  ];
  table("Balance Sheet", `What the business owns and owes, as of ${input.balanceAsOf}`, TEAL, balanceLines);

  // ── Profit & Loss ──
  const margins = computeMargins(pl);
  const pct = (v: number | null) => (v == null ? "-" : `${v.toFixed(1)}%`);
  const netProfit = pl.netProfit + vendorProfit;
  const netMargin = netMarginPct(netProfit, pl.netRevenue, vendorProfit, pl.missingCostSales);
  const plLines: Line[] = [
    { kind: "plain", label: "Net revenue", note: "All orders except cancelled and returned, after discounts, paid or not", value: pl.netRevenue },
    ...(Math.abs(pl.uncollected) > 0.005
      ? ([
          { kind: "sub", label: "Money received", note: "The paid part of the sales", value: pl.collected },
          { kind: "sub", label: "Still to collect", note: "Sold but not paid yet", value: pl.uncollected },
        ] as Line[])
      : []),
    { kind: "plain", label: "Cost of goods sold", note: "What the items sold cost you (TP)", value: pl.cogs, cost: true },
    {
      kind: "total",
      label: "Gross profit",
      note:
        `Profit on TP ${pct(margins.profitOnTp)}, margin on selling price ${pct(margins.grossMargin)}` +
        (pl.missingCostLines > 0 ? `. ${pl.missingCostLines} item lines have no TP and are left out of these percentages` : ""),
      value: pl.grossProfit,
    },
    { kind: "plain", label: "Operating expenses", note: "Rent, salary, ads and other running costs", value: pl.operatingExpenses, cost: true },
    ...(Math.abs(pl.netDeliveryCost) > 0.005
      ? ([
          {
            kind: "plain",
            label: pl.netDeliveryCost > 0 ? "Delivery cost" : "Delivery gain",
            note: pl.netDeliveryCost > 0 ? "Courier cost beyond what customers paid" : "Delivery charged was more than it cost",
            value: Math.abs(pl.netDeliveryCost),
            cost: pl.netDeliveryCost > 0,
          },
        ] as Line[])
      : []),
    ...(Math.abs(vendorProfit) > 0.005 ? ([{ kind: "plain", label: "Vendor margin", note: "Your share of vendor payments", value: vendorProfit }] as Line[]) : []),
    ...(Math.abs(pl.otherIncome ?? 0) > 0.005
      ? ([{ kind: "plain", label: "Other income and cash differences", note: "From a month closed before the Money Book was replaced", value: Math.abs(pl.otherIncome), cost: (pl.otherIncome ?? 0) < 0 }] as Line[])
      : []),
    { kind: "final", label: netProfit < 0 ? "Net loss" : "Net profit", note: `Net margin ${pct(netMargin)}`, value: netProfit },
  ];
  // The Profit & Loss starts on a fresh page when the balance sheet leaves too little room for it.
  if (y > 200) {
    pdf.addPage();
    y = 20;
  }
  table("Profit & Loss", `Did the business make money? ${input.periodLabel}`, ORANGE, plLines);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...MUTED);
  const note = "Revenue counts when the sale is made and its cost counts with it. Buying stock is not an expense: it turns cash into stock, and reaches profit only as the goods sell. Investor money is never part of sales or profit.";
  const wrappedNote = pdf.splitTextToSize(note, contentWidth) as string[];
  if (y + wrappedNote.length * 3.5 > 280) {
    pdf.addPage();
    y = 20;
  }
  pdf.text(wrappedNote, margin, y);

  // ── Footer ──
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(156, 163, 175);
    textWithFont(`${input.storeName} · Balance Sheet and Profit & Loss · Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: "center" });
  }

  pdf.save(`${slug(input.storeName)}-balance-sheet-${dayjs().format("YYYY-MM-DD")}.pdf`);
}
