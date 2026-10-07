import dayjs from "dayjs";
import type { ProfitLossReport } from "@/lib/queries/dashboard/getProfitLossReport";
import { enableBengaliText } from "@/lib/pdf/bengaliPdfText";
import { loadBengaliFontBrowser } from "@/lib/pdf/bengaliFontBrowser";

export interface ProfitLossReportMeta {
  storeName: string;
  fromDate: string;
  toDate: string;
  currencySymbol: string;
}

function money(v: number): string {
  return Number(v).toFixed(2);
}

function buildFilename(meta: ProfitLossReportMeta): string {
  const safeSlug = meta.storeName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return `${safeSlug || "profit-loss"}-${meta.fromDate}-to-${meta.toDate}.pdf`;
}

const BENGALI_FONT_URL = "/fonts/NotoSansBengali-Regular.ttf";
let bengaliFontBase64Cache: string | null | undefined;

// Same browser-side font loader as exportSalesReport.ts's PDF export —
// fetches the .ttf as a public asset since jsPDF has no Bengali glyphs of
// its own and Node's fs isn't available client-side.
async function loadBengaliFontBase64(): Promise<string | null> {
  if (bengaliFontBase64Cache !== undefined) return bengaliFontBase64Cache;
  try {
    const res = await fetch(BENGALI_FONT_URL);
    if (!res.ok) {
      bengaliFontBase64Cache = null;
      return null;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    bengaliFontBase64Cache = btoa(binary);
  } catch {
    bengaliFontBase64Cache = null;
  }
  return bengaliFontBase64Cache;
}

function hasBengaliChar(text: string): boolean {
  return /[ঀ-৿]/.test(text);
}

type JsPDFInstance = InstanceType<typeof import("jspdf").jsPDF>;

async function registerBengaliFontBrowser(pdf: JsPDFInstance): Promise<boolean> {
  const base64 = await loadBengaliFontBase64();
  if (!base64) return false;
  try {
    pdf.addFileToVFS("NotoSansBengali-Regular.ttf", base64);
    pdf.addFont("NotoSansBengali-Regular.ttf", "NotoSansBengali", "normal");
    return !!pdf.getFontList()["NotoSansBengali"];
  } catch {
    return false;
  }
}

function applyBengaliFontBrowser(pdf: JsPDFInstance, text: string, bengaliLoaded: boolean): void {
  if (bengaliLoaded && hasBengaliChar(text)) {
    pdf.setFont("NotoSansBengali", "normal");
  }
}

type Rgb = [number, number, number];

const INDIGO: Rgb = [79, 70, 229];
const GREEN: Rgb = [5, 150, 105];
const RED: Rgb = [220, 38, 38];
const DARK: Rgb = [31, 41, 55];
const MUTED: Rgb = [107, 114, 128];

/**
 * One-page-first P&L: the result (profit or loss) up top, then the
 * statement line by line — sales, minus what it cost, minus expenses — the
 * same story the Profit & Loss page tells. The trend underneath only lists
 * days (or months, for ranges over a month) that actually had activity, so
 * a quiet quarter isn't four pages of ৳0.00.
 */
export async function exportProfitLossReportPDF(
  report: ProfitLossReport,
  meta: ProfitLossReportMeta,
): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  enableBengaliText(pdf, await loadBengaliFontBrowser());
  const bengaliLoaded = await registerBengaliFontBrowser(pdf);
  pdf.setFont("helvetica");

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const cur = (v: number) => `${v < 0 ? "-" : ""}${meta.currencySymbol}${money(Math.abs(v))}`;
  // ৳ isn't in Helvetica — any cell holding it switches to the Bengali font.
  const textWithFont = (text: string, x: number, y: number, opts?: { align?: "right" | "center" }) => {
    applyBengaliFontBrowser(pdf, text, bengaliLoaded);
    pdf.text(text, x, y, opts);
  };

  // ── Header band ──
  const bandHeight = 30;
  pdf.setFillColor(...INDIGO);
  pdf.rect(0, 0, pageWidth, bandHeight, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  textWithFont(meta.storeName, margin, 13);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(224, 231, 255);
  pdf.text("Profit & Loss Report", margin, 20);
  pdf.setFontSize(8.5);
  pdf.text(`${dayjs(meta.fromDate).format("DD-MM-YYYY")} – ${dayjs(meta.toDate).format("DD-MM-YYYY")}`, pageWidth - margin, 13, {
    align: "right",
  });
  pdf.text(`Generated ${dayjs().format("DD-MM-YYYY, HH:mm")}`, pageWidth - margin, 20, { align: "right" });

  // ── Result box: profit or loss in one number ──
  const isLoss = report.netProfit < 0;
  const resultTop = bandHeight + 8;
  const resultHeight = 24;
  const tone = isLoss ? RED : GREEN;
  pdf.setFillColor(...(isLoss ? ([254, 242, 242] as Rgb) : ([236, 253, 245] as Rgb)));
  pdf.setDrawColor(...tone);
  pdf.roundedRect(margin, resultTop, contentWidth, resultHeight, 3, 3, "FD");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text(isLoss ? "Net loss for this period" : "Net profit for this period", margin + 6, resultTop + 9);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(...tone);
  textWithFont(cur(report.netProfit), margin + 6, resultTop + 19);
  if (report.totalSales > 0) {
    const marginPct = (report.netProfit / report.totalSales) * 100;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...MUTED);
    pdf.text(`Profit margin ${marginPct.toFixed(1)}% of sales`, pageWidth - margin - 6, resultTop + 14, {
      align: "right",
    });
  }

  // ── Sales · Received · To collect ──
  const cellsTop = resultTop + resultHeight + 6;
  const cellW = (contentWidth - 8) / 3;
  const cells: { label: string; value: number; color: Rgb }[] = [
    { label: "Sales (all orders)", value: report.salesAll, color: DARK },
    { label: "Received", value: report.totalSales, color: GREEN },
    { label: "To collect", value: report.toCollect, color: [180, 83, 9] },
  ];
  cells.forEach((cell, i) => {
    const x = margin + i * (cellW + 4);
    pdf.setDrawColor(229, 231, 235);
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(x, cellsTop, cellW, 16, 2, 2, "FD");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED);
    pdf.text(cell.label, x + 4, cellsTop + 6);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...cell.color);
    textWithFont(cur(cell.value), x + 4, cellsTop + 12.5);
  });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...MUTED);
  pdf.text("Profit is worked out on money received only, so an order that may still be returned is never counted as profit.", margin, cellsTop + 21);

  // ── The statement, line by line ──
  type Line = { sign: string; label: string; note: string; value: number; kind: "plain" | "cost" | "total" | "final" };
  const lines: Line[] = [
    { sign: "", label: "Sales received", note: "Paid orders, without delivery charge and tax", value: report.totalSales, kind: "plain" },
    ...(report.additionalCharges > 0
      ? [{ sign: "", label: "   of which extra charges", note: "Packaging, handling etc. (already in sales)", value: report.additionalCharges, kind: "plain" as const }]
      : []),
    { sign: "−", label: "Cost of goods sold", note: "What the items cost you", value: report.cogs, kind: "cost" },
    { sign: "=", label: "Gross profit", note: "Earned on the items sold", value: report.grossProfit, kind: "total" },
    { sign: "−", label: "Expenses", note: "Rent, salary, ads and other costs", value: report.totalExpenses, kind: "cost" },
    {
      sign: report.deliveryNetCost < 0 ? "+" : "−",
      label: "Delivery cost",
      note: report.deliveryNetCost < 0 ? "Delivery charged was more than it cost" : "Courier cost beyond what customers paid",
      value: Math.abs(report.deliveryNetCost),
      kind: report.deliveryNetCost < 0 ? "plain" : "cost",
    },
    ...(Math.abs(report.vendorProfit) > 0.005
      ? [{ sign: "+", label: "Vendor profit", note: "Your share of vendor payments", value: report.vendorProfit, kind: "plain" as const }]
      : []),
    { sign: "=", label: isLoss ? "Net loss" : "Net profit", note: "", value: report.netProfit, kind: "final" },
  ];

  autoTable(pdf, {
    startY: cellsTop + 26,
    head: [["", "Statement", "", "Amount"]],
    body: lines.map((l) => [
      l.sign,
      l.label,
      l.note,
      l.kind === "cost" ? `-${meta.currencySymbol}${money(l.value)}` : cur(l.value),
    ]),
    theme: "plain",
    styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }, font: "helvetica", textColor: DARK },
    headStyles: { fillColor: INDIGO, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9.5 },
    columnStyles: {
      0: { cellWidth: 8, halign: "center", textColor: MUTED, fontStyle: "bold" },
      1: { cellWidth: 52, fontStyle: "bold" },
      2: { textColor: MUTED, fontSize: 8.5 },
      3: { cellWidth: 38, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (cell) => {
      if (cell.section !== "body") return;
      const line = lines[cell.row.index];
      if (line.kind === "total") cell.cell.styles.fillColor = [238, 242, 255];
      if (line.kind === "final") {
        cell.cell.styles.fillColor = isLoss ? [254, 242, 242] : [236, 253, 245];
        cell.cell.styles.fontSize = 11.5;
        if (cell.column.index === 3) cell.cell.styles.textColor = tone;
      }
      if (line.kind === "cost" && cell.column.index === 3) cell.cell.styles.textColor = RED;
      if (line.label.startsWith("   ") && cell.column.index === 1) cell.cell.styles.fontStyle = "normal";
      const text = String(cell.cell.raw ?? "");
      if (bengaliLoaded && hasBengaliChar(text)) {
        cell.cell.styles.font = "NotoSansBengali";
        cell.cell.styles.fontStyle = "normal";
      }
    },
    margin: { left: margin, right: margin, bottom: 16 },
  });

  // ── Profit by day / month, active periods only ──
  const byMonth = dayjs(meta.toDate).diff(dayjs(meta.fromDate), "day") > 31;
  const buckets = new Map<string, number>();
  for (const point of report.trend) {
    const key = byMonth ? dayjs(point.date).format("YYYY-MM") : point.date;
    buckets.set(key, (buckets.get(key) ?? 0) + point.net_profit);
  }
  const activeRows = [...buckets.entries()].filter(([, v]) => Math.abs(v) > 0.005).sort(([a], [b]) => (a < b ? -1 : 1));

  const statementEnd = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 140;
  let y = statementEnd + 10;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...DARK);
  pdf.text(byMonth ? "Profit by month" : "Profit by day", margin, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text("Sales profit minus expenses, for periods with activity. Vendor profit is counted in the total only.", margin, y + 5);
  y += 8;

  if (activeRows.length === 0) {
    pdf.setFontSize(9.5);
    pdf.text("No sales or expenses in this period.", margin, y + 6);
  } else {
    autoTable(pdf, {
      startY: y,
      head: [[byMonth ? "Month" : "Date", "Profit"]],
      body: activeRows.map(([key, v]) => [
        byMonth ? dayjs(`${key}-01`).format("MMMM YYYY") : dayjs(key).format("DD-MM-YYYY, ddd"),
        cur(v),
      ]),
      theme: "grid",
      styles: { fontSize: 9.5, cellPadding: 2.6, font: "helvetica", textColor: DARK, lineColor: [229, 231, 235] },
      headStyles: { fillColor: [243, 244, 246], textColor: DARK, fontStyle: "bold" },
      columnStyles: { 1: { halign: "right", cellWidth: 45 } },
      didParseCell: (cell) => {
        if (cell.section !== "body") return;
        const text = String(cell.cell.raw ?? "");
        if (cell.column.index === 1 && text.startsWith("-")) cell.cell.styles.textColor = RED;
        if (bengaliLoaded && hasBengaliChar(text)) {
          cell.cell.styles.font = "NotoSansBengali";
          cell.cell.styles.fontStyle = "normal";
        }
      },
      margin: { left: margin, right: margin, bottom: 16 },
    });
  }

  // ── Footer ──
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(156, 163, 175);
    textWithFont(`${meta.storeName} · Profit & Loss · Page ${i} of ${totalPages}`, pageWidth / 2, 290, {
      align: "center",
    });
  }

  pdf.save(buildFilename(meta));
}
