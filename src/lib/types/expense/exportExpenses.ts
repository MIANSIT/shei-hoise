import type { Expense } from "@/lib/types/expense/type";
import dayjs from "dayjs";
import { CURRENCY_ICONS } from "@/lib/types/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExportFormat = "csv" | "xlsx" | "pdf";

// ─── PDF currency fallback ────────────────────────────────────────────────────
// jsPDF's built-in helvetica font doesn't support Unicode symbols like ৳, ¥, €
// Invert CURRENCY_ICONS to map symbol → code: { "৳": "BDT", ... }

const SYMBOL_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(CURRENCY_ICONS).map(([code, symbol]) => [symbol, code]),
);

function toPdfCurrency(symbol: string): string {
  return SYMBOL_TO_CODE[symbol] ?? symbol;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  return Number(amount).toFixed(2);
}

function formatDate(date: string): string {
  return dayjs(date).format("MMM D, YYYY");
}

function getRows(expenses: Expense[]): string[][] {
  return expenses.map((e) => [
    e.title,
    e.category?.name ?? "",
    formatAmount(e.amount),
    formatDate(e.expense_date),
    e.payment_method ?? "",
    e.vendor_name ?? "",
    e.platform ?? "",
    e.description ?? "",
    e.notes ?? "",
  ]);
}

function getHeaders(currencySymbol: string): string[] {
  return [
    "Title",
    "Category",
    `Amount (${currencySymbol})`,
    "Date",
    "Payment Method",
    "Vendor",
    "Platform",
    "Description",
    "Notes",
  ];
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function exportCSV(
  expenses: Expense[],
  filename = "expenses",
  currencySymbol = "৳",
): void {
  const escape = (v: string) =>
    `"${v.replace(/"/g, '""').replace(/\n/g, " ")}"`;

  const headers = getHeaders(currencySymbol);
  const lines = [
    headers.map(escape).join(","),
    ...getRows(expenses).map((row) => row.map(escape).join(",")),
  ];

  const blob = new Blob([lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, `${filename}.csv`);
}

// ─── XLSX ─────────────────────────────────────────────────────────────────────

export async function exportXLSX(
  expenses: Expense[],
  filename = "expenses",
  currencySymbol = "৳",
): Promise<void> {
  const XLSX = await import("xlsx");

  const headers = getHeaders(currencySymbol);
  const rows = getRows(expenses);
  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const wsData = [
    headers,
    ...rows,
    [],
    ["", "", `Total: ${currencySymbol} ${total.toFixed(2)}`],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!cols"] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 22 },
    { wch: 16 },
    { wch: 30 },
    { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Expenses");

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export async function exportPDF(
  expenses: Expense[],
  filename = "expenses",
  currencySymbol = "৳",
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  // Convert Unicode symbol → ASCII code for PDF font compatibility
  // e.g. "৳" → "BDT"
  const pdfCurrency = toPdfCurrency(currencySymbol);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 297, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Expense Report", 14, 12);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const subtitle = `Exported ${dayjs().format("MMM D, YYYY")}  ·  ${expenses.length} record${expenses.length !== 1 ? "s" : ""}`;
  doc.text(subtitle, 14, 17.5);

  const headers = getHeaders(pdfCurrency); // "Amount (BDT)"
  const rows = getRows(expenses);
  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  autoTable(doc, {
    startY: 22,
    head: [headers],
    body: [
      ...rows,
      [
        "",
        "",
        `${pdfCurrency} ${total.toFixed(2)}`, // "BDT 47.00"
        "",
        "",
        "",
        "",
        "TOTAL",
        "",
      ],
    ],
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 3,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    columnStyles: {
      2: { halign: "right" },
    },
    didParseCell(data) {
      if (data.row.index === rows.length) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [237, 233, 254];
        data.cell.styles.textColor = [109, 40, 217];
      }
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}

// ─── Main export entry point ──────────────────────────────────────────────────

export async function exportExpenses(
  format: ExportFormat,
  expenses: Expense[],
  storeSlug?: string,
  currencySymbol = "৳",
): Promise<void> {
  const stamp = dayjs().format("YYYY-MM-DD");

  const safeSlug = storeSlug
    ? storeSlug
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-{2,}/g, "-")
        .replace(/^-|-$/g, "")
    : null;

  const name = safeSlug ? `${safeSlug}-expenses-${stamp}` : `expenses-${stamp}`;

  switch (format) {
    case "csv":
      exportCSV(expenses, name, currencySymbol);
      break;
    case "xlsx":
      await exportXLSX(expenses, name, currencySymbol);
      break;
    case "pdf":
      await exportPDF(expenses, name, currencySymbol);
      break;
  }
}

// ─── Internal helper ──────────────────────────────────────────────────────────

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