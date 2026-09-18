import dayjs from "dayjs";
import type { ProfitLossReport } from "@/lib/queries/dashboard/getProfitLossReport";

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

/** Same header-band/KPI-card/table/footer structure as exportSalesReport.ts's PDF, adapted for a P&L line-item summary plus the daily net-profit trend behind it. */
export async function exportProfitLossReportPDF(
  report: ProfitLossReport,
  meta: ProfitLossReportMeta,
): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const bengaliLoaded = await registerBengaliFontBrowser(pdf);
  pdf.setFont("helvetica");

  const pageWidth = 210;
  const margin = 14;

  const bandHeight = 34;
  pdf.setFillColor(79, 70, 229);
  pdf.rect(0, 0, pageWidth, bandHeight, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  applyBengaliFontBrowser(pdf, meta.storeName, bengaliLoaded);
  pdf.text(meta.storeName, margin, 16);
  pdf.setFont("helvetica", "bold");

  pdf.setFontSize(10);
  pdf.setTextColor(224, 231, 255);
  pdf.text("Profit & Loss Report", margin, 23);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  const periodText = `Period: ${meta.fromDate} to ${meta.toDate}`;
  pdf.text(periodText, pageWidth - margin - pdf.getTextWidth(periodText), 14);
  const generatedText = `Generated: ${dayjs().format("YYYY-MM-DD HH:mm")}`;
  pdf.text(generatedText, pageWidth - margin - pdf.getTextWidth(generatedText), 20);

  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");

  const kpis: { label: string; value: string }[] = [
    { label: "Total Sales", value: `${meta.currencySymbol}${money(report.totalSales)}` },
    { label: "COGS", value: `${meta.currencySymbol}${money(report.cogs)}` },
    { label: "Gross Profit", value: `${meta.currencySymbol}${money(report.grossProfit)}` },
    { label: "Total Expense", value: `${meta.currencySymbol}${money(report.totalExpenses)}` },
    { label: "Delivery Cost", value: `${meta.currencySymbol}${money(report.deliveryNetCost)}` },
    { label: "Vendor Profit", value: `${meta.currencySymbol}${money(report.vendorProfit)}` },
    { label: "Net Profit", value: `${meta.currencySymbol}${money(report.netProfit)}` },
  ];

  const cardsTop = bandHeight + 8;
  const cardGap = 4;
  const cardWidth = (pageWidth - margin * 2 - cardGap * (kpis.length - 1)) / kpis.length;
  const cardHeight = 22;

  kpis.forEach((kpi, i) => {
    const x = margin + i * (cardWidth + cardGap);
    pdf.setDrawColor(224, 224, 224);
    pdf.setFillColor(250, 250, 252);
    pdf.roundedRect(x, cardsTop, cardWidth, cardHeight, 2, 2, "FD");

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(107, 114, 128);
    pdf.text(kpi.label, x + 3, cardsTop + 8);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(
      kpi.label === "Net Profit" && report.netProfit < 0 ? 225 : 31,
      kpi.label === "Net Profit" && report.netProfit < 0 ? 29 : 41,
      kpi.label === "Net Profit" && report.netProfit < 0 ? 72 : 55,
    );
    applyBengaliFontBrowser(pdf, kpi.value, bengaliLoaded);
    pdf.text(kpi.value, x + 3, cardsTop + 17);
    pdf.setFont("helvetica", "normal");
  });
  pdf.setTextColor(0, 0, 0);

  const tableStartY = cardsTop + cardHeight + 8;

  autoTable(pdf, {
    startY: tableStartY,
    head: [["Date", "Net Profit"]],
    body: report.trend.map((p) => [
      dayjs(p.date).format("DD MMM YYYY"),
      `${meta.currencySymbol}${money(p.net_profit)}`,
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3, font: "helvetica" },
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    columnStyles: { 1: { halign: "right" } },
    didParseCell: (cell) => {
      if (bengaliLoaded && cell.section !== "head") {
        const cellText = String(cell.cell.raw ?? "");
        if (hasBengaliChar(cellText)) {
          cell.cell.styles.font = "NotoSansBengali";
          cell.cell.styles.fontStyle = "normal";
        }
      }
    },
    margin: { left: margin, right: margin, bottom: 16 },
  });

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(156, 163, 175);
    applyBengaliFontBrowser(pdf, meta.storeName, bengaliLoaded);
    const footerText = `${meta.storeName} · Page ${i} of ${totalPages}`;
    pdf.text(footerText, pageWidth / 2, 290, { align: "center" });
    pdf.setFont("helvetica", "normal");
  }

  pdf.save(buildFilename(meta));
}
