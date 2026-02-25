import type { Expense } from "@/lib/types/expense/type";
import dayjs from "dayjs";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExportFormat = "csv" | "xlsx" | "pdf";

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

const HEADERS = [
  "Title",
  "Category",
  "Amount ($)",
  "Date",
  "Payment Method",
  "Vendor",
  "Platform",
  "Description",
  "Notes",
];

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function exportCSV(expenses: Expense[], filename = "expenses"): void {
  const escape = (v: string) =>
    `"${v.replace(/"/g, '""').replace(/\n/g, " ")}"`;

  const lines = [
    HEADERS.map(escape).join(","),
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
): Promise<void> {
  // Dynamically import SheetJS so it doesn't bloat the initial bundle
  const XLSX = await import("xlsx");

  const rows = getRows(expenses);

  // Summary totals row
  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const wsData = [
    HEADERS,
    ...rows,
    [], // blank separator
    ["", "", `Total: $${total.toFixed(2)}`],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = [
    { wch: 28 }, // Title
    { wch: 18 }, // Category
    { wch: 14 }, // Amount
    { wch: 14 }, // Date
    { wch: 16 }, // Payment
    { wch: 22 }, // Vendor
    { wch: 16 }, // Platform
    { wch: 30 }, // Description
    { wch: 30 }, // Notes
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Expenses");

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export async function exportPDF(
  expenses: Expense[],
  filename = "expenses",
): Promise<void> {
  // Dynamically import jsPDF + autoTable
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Header bar
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 297, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Expense Report", 14, 12);

  // Sub-header: date range
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const subtitle = `Exported ${dayjs().format("MMM D, YYYY")}  ·  ${expenses.length} record${expenses.length !== 1 ? "s" : ""}`;
  doc.text(subtitle, 14, 17.5);

  const rows = getRows(expenses);
  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  autoTable(doc, {
    startY: 22,
    head: [HEADERS],
    body: [
      ...rows,
      ["", "", `$${total.toFixed(2)}`, "", "", "", "", "TOTAL", ""],
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
      2: { halign: "right" }, // Amount
    },
    // Highlight total row
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
): Promise<void> {
  const stamp = dayjs().format("YYYY-MM-DD");

  // Sanitize slug from useCurrentUser (stores.store_slug)
  // Produces: "my-store-expenses-2025-02-26" or "expenses-2025-02-26"
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
      exportCSV(expenses, name);
      break;
    case "xlsx":
      await exportXLSX(expenses, name);
      break;
    case "pdf":
      await exportPDF(expenses, name);
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
  // Revoke after a short delay to ensure download starts
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
