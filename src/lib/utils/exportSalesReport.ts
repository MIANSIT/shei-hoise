import dayjs from "dayjs";
import type { SalesReportResult } from "@/lib/queries/orders/getSalesReport";

export interface SalesReportMeta {
  storeName: string;
  fromDate: string;
  toDate: string;
  granularityLabel: string;
  currencySymbol: string;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function money(v: number): string {
  return Number(v).toFixed(2);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildFilename(meta: SalesReportMeta, ext: string): string {
  const safeSlug = meta.storeName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return `${safeSlug || "sales-report"}-${meta.fromDate}-to-${meta.toDate}.${ext}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string; // "data:image/png;base64,AAAA..."
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const DATA_HEADERS = ["Period", "Orders", "Revenue", "Online Revenue", "Quick Sale Revenue"];

function getDataRows(report: SalesReportResult): (string | number)[][] {
  return report.rows.map((r) => [
    r.period_label,
    r.orders_count,
    money(r.revenue),
    money(r.online_revenue),
    money(r.pos_revenue),
  ]);
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function exportSalesReportCSV(report: SalesReportResult, meta: SalesReportMeta): void {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""').replace(/\n/g, " ")}"`;

  const lines: string[] = [
    [`${meta.storeName} — Sales Report`].map(escape).join(","),
    [`Period: ${meta.fromDate} to ${meta.toDate} (${meta.granularityLabel})`].map(escape).join(","),
    [`Generated: ${dayjs().format("YYYY-MM-DD HH:mm")}`].map(escape).join(","),
    "",
    ["Total Sales", `${meta.currencySymbol}${money(report.totalRevenue)}`].map(escape).join(","),
    ["Total Orders", String(report.totalOrders)].map(escape).join(","),
    ["Online Sales", `${meta.currencySymbol}${money(report.onlineRevenue)}`].map(escape).join(","),
    ["Quick Sale (POS)", `${meta.currencySymbol}${money(report.posRevenue)}`].map(escape).join(","),
    ["Average Order Value", `${meta.currencySymbol}${money(report.averageOrderValue)}`].map(escape).join(","),
    "",
    DATA_HEADERS.map(escape).join(","),
    ...getDataRows(report).map((row) => row.map(escape).join(",")),
  ];

  // UTF-8 BOM so Excel renders non-ASCII (e.g. Bengali store names) correctly.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, buildFilename(meta, "csv"));
}

// ─── XLSX (styled workbook + store logo via exceljs) ───────────────────────────
// The plain `xlsx` (SheetJS Community Edition) package used elsewhere in this
// app can't write cell colors/fills or embed images — both are paid-tier
// SheetJS features. exceljs is a separate, fully-featured library that
// supports real cell styling, a proper Excel Table (banded rows + filter
// dropdowns), and image embedding, which is what "modern format with a logo"
// actually requires.

type ExcelJSNamespace = typeof import("exceljs");

export async function exportSalesReportXLSX(
  report: SalesReportResult,
  meta: SalesReportMeta,
  logoUrl?: string | null,
): Promise<void> {
  // Dynamic-import the browser-safe bundle (the package's default "main"
  // entry targets Node and pulls in `fs`, which doesn't bundle for the
  // client). `typeof import("exceljs")` above gives us the real typings
  // without pulling that Node-targeted module into this file's runtime code.
  // The subpath has no declaration file of its own (exceljs's "types" field
  // only covers its Node-targeted main entry) — resolves to a real .js file
  // on disk, not a missing module, so an ambient `declare module` shim
  // doesn't take effect here; immediately re-typed via the cast below.
  // @ts-expect-error -- see comment above
  const mod = (await import("exceljs/dist/exceljs.min.js")) as unknown as {
    default?: ExcelJSNamespace;
  } & ExcelJSNamespace;
  const ExcelJS = mod.default ?? mod;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.storeName;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Sales Report", {
    views: [{ showGridLines: false }],
  });

  sheet.columns = [{ width: 24 }, { width: 12 }, { width: 16 }, { width: 18 }, { width: 20 }];

  let r = 1;

  sheet.mergeCells(`A${r}:E${r}`);
  const titleCell = sheet.getCell(`A${r}`);
  titleCell.value = `${meta.storeName} — Sales Report`;
  titleCell.font = { bold: true, size: 16, color: { argb: "FF4F46E5" } };
  sheet.getRow(r).height = 26;
  r += 1;

  sheet.mergeCells(`A${r}:E${r}`);
  sheet.getCell(`A${r}`).value = `Period: ${meta.fromDate} to ${meta.toDate} (${meta.granularityLabel})`;
  sheet.getCell(`A${r}`).font = { size: 10, color: { argb: "FF6B7280" } };
  r += 1;

  sheet.mergeCells(`A${r}:E${r}`);
  sheet.getCell(`A${r}`).value = `Generated: ${dayjs().format("YYYY-MM-DD HH:mm")}`;
  sheet.getCell(`A${r}`).font = { size: 9, italic: true, color: { argb: "FF9CA3AF" } };
  r += 2;

  // Store logo — best-effort. Some store logos aren't served with CORS
  // headers permissive enough for a cross-origin fetch (same caveat as the
  // QR-code logo overlay elsewhere in this app), so this fails silently
  // rather than blocking the whole export.
  if (logoUrl) {
    try {
      const res = await fetch(logoUrl);
      if (res.ok) {
        const blob = await res.blob();
        const extension = blob.type.includes("jpeg") || blob.type.includes("jpg") ? "jpeg" : "png";
        const base64 = await blobToBase64(blob);
        if (base64) {
          const imageId = workbook.addImage({ base64, extension });
          sheet.addImage(imageId, { tl: { col: 4.3, row: 0.15 }, ext: { width: 64, height: 64 } });
        }
      }
    } catch (err) {
      console.warn("Sales report export: could not embed store logo", err);
    }
  }

  // ── KPI strip (label row + bold value row, 5 across to mirror the columns below) ──
  const kpis: [string, string | number][] = [
    ["Total Sales", `${meta.currencySymbol}${money(report.totalRevenue)}`],
    ["Total Orders", report.totalOrders],
    ["Online Sales", `${meta.currencySymbol}${money(report.onlineRevenue)}`],
    ["Quick Sale (POS)", `${meta.currencySymbol}${money(report.posRevenue)}`],
    ["Avg Order Value", `${meta.currencySymbol}${money(report.averageOrderValue)}`],
  ];
  const kpiLabelRow = sheet.getRow(r);
  const kpiValueRow = sheet.getRow(r + 1);
  kpis.forEach(([label, value], i) => {
    const col = i + 1;
    const labelCell = kpiLabelRow.getCell(col);
    labelCell.value = label;
    labelCell.font = { bold: true, size: 9, color: { argb: "FF6B7280" } };
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };

    const valueCell = kpiValueRow.getCell(col);
    valueCell.value = value;
    valueCell.font = { bold: true, size: 13, color: { argb: "FF1F2937" } };
    valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
  });
  kpiValueRow.height = 20;
  r += 3;

  // ── Data table (real Excel Table: banded rows + filter dropdowns) ──
  const tableStartRow = r;
  sheet.addTable({
    name: "SalesData",
    ref: `A${tableStartRow}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium9", showRowStripes: true },
    columns: DATA_HEADERS.map((name) => ({ name, filterButton: true })),
    rows: report.rows.map((row) => [
      row.period_label,
      row.orders_count,
      row.revenue,
      row.online_revenue,
      row.pos_revenue,
    ]),
  });

  report.rows.forEach((_, i) => {
    const dataRowNum = tableStartRow + 1 + i; // +1 to skip the table's own header row
    ["C", "D", "E"].forEach((col) => {
      sheet.getCell(`${col}${dataRowNum}`).numFmt = "#,##0.00";
    });
  });

  sheet.views = [{ state: "frozen", ySplit: tableStartRow, showGridLines: false }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, buildFilename(meta, "xlsx"));
}

// ─── PDF (native, hand-drawn document — not a canvas screenshot) ──────────────
// An earlier version rendered this by screenshotting the on-screen report
// with html2canvas and embedding that image. Two problems with that:
// a screenshot's pixel height rarely fills a full A4 page, so most of the
// page came out blank, and canvas-rendered text garbled the ৳ currency
// glyph (clipped/overlapping digits). Drawing natively with jsPDF +
// autoTable — the same approach already used for the invoice PDFs in
// invoicePdfLayouts.ts — gives crisp, correctly laid out text and
// paginates properly for long reports.

const BENGALI_FONT_URL = "/fonts/NotoSansBengali-Regular.ttf";
let bengaliFontBase64Cache: string | null | undefined;

// Browser-side equivalent of invoicePdfHelpers.ts's font loader (that one
// reads the .ttf via Node's `fs`, which isn't available client-side) —
// fetches the same font file as a public asset instead.
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

export async function exportSalesReportPDF(
  report: SalesReportResult,
  meta: SalesReportMeta,
  bucket: "day" | "month",
  logoUrl?: string | null,
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

  // ── Header band ──
  const bandHeight = 34;
  pdf.setFillColor(79, 70, 229); // indigo-600
  pdf.rect(0, 0, pageWidth, bandHeight, "F");

  let logoDrawn = false;
  if (logoUrl) {
    try {
      const res = await fetch(logoUrl);
      if (res.ok) {
        const blob = await res.blob();
        const base64 = await blobToBase64(blob);
        const format = blob.type.includes("png") ? "PNG" : "JPEG";
        if (base64) {
          pdf.addImage(`data:${blob.type};base64,${base64}`, format, margin, 7, 20, 20);
          logoDrawn = true;
        }
      }
    } catch (err) {
      // Best-effort — some store logos aren't served with CORS headers
      // permissive enough for a cross-origin fetch (same caveat as the
      // QR-code logo overlay elsewhere in this app).
      console.warn("Sales report PDF export: could not embed store logo", err);
    }
  }
  const titleX = logoDrawn ? margin + 26 : margin;

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  applyBengaliFontBrowser(pdf, meta.storeName, bengaliLoaded);
  pdf.text(meta.storeName, titleX, 16);
  pdf.setFont("helvetica", "bold");

  pdf.setFontSize(10);
  pdf.setTextColor(224, 231, 255); // indigo-100
  pdf.text("Sales Report", titleX, 23);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  const periodText = `Period: ${meta.fromDate} to ${meta.toDate} (${meta.granularityLabel})`;
  pdf.text(periodText, pageWidth - margin - pdf.getTextWidth(periodText), 14);
  const generatedText = `Generated: ${dayjs().format("YYYY-MM-DD HH:mm")}`;
  pdf.text(generatedText, pageWidth - margin - pdf.getTextWidth(generatedText), 20);

  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");

  // ── KPI cards ──
  const kpis: { label: string; value: string }[] = [
    { label: "Total Sales", value: `${meta.currencySymbol}${money(report.totalRevenue)}` },
    { label: "Orders", value: String(report.totalOrders) },
    { label: "Online Sales", value: `${meta.currencySymbol}${money(report.onlineRevenue)}` },
    { label: "Quick Sale (POS)", value: `${meta.currencySymbol}${money(report.posRevenue)}` },
  ];

  const cardsTop = bandHeight + 8;
  const cardGap = 5;
  const cardWidth = (pageWidth - margin * 2 - cardGap * (kpis.length - 1)) / kpis.length;
  const cardHeight = 22;

  kpis.forEach((kpi, i) => {
    const x = margin + i * (cardWidth + cardGap);
    pdf.setDrawColor(224, 224, 224);
    pdf.setFillColor(250, 250, 252);
    pdf.roundedRect(x, cardsTop, cardWidth, cardHeight, 2, 2, "FD");

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text(kpi.label, x + 4, cardsTop + 8);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12.5);
    pdf.setTextColor(31, 41, 55);
    applyBengaliFontBrowser(pdf, kpi.value, bengaliLoaded);
    pdf.text(kpi.value, x + 4, cardsTop + 17);
    pdf.setFont("helvetica", "normal");
  });
  pdf.setTextColor(0, 0, 0);

  // ── Data table ──
  const tableStartY = cardsTop + cardHeight + 8;
  const periodHeader = bucket === "month" ? "Month" : "Date";

  autoTable(pdf, {
    startY: tableStartY,
    head: [[periodHeader, "Orders", "Revenue", "Online", "Quick Sale"]],
    body: report.rows.map((row) => [
      row.period_label,
      String(row.orders_count),
      `${meta.currencySymbol}${money(row.revenue)}`,
      `${meta.currencySymbol}${money(row.online_revenue)}`,
      `${meta.currencySymbol}${money(row.pos_revenue)}`,
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3, font: "helvetica" },
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
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

  // Footer with correct "Page X of Y" — drawn after the table finishes
  // rather than in autoTable's didDrawPage, since the total page count
  // isn't known until all of autoTable's own pagination has happened.
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

  pdf.save(buildFilename(meta, "pdf"));
}
