export interface PrintOrderListRow {
  name: string;
  sku: string | null;
  stock: number;
  order: number;
  unitCost: number;
  cost: number;
}

export interface PrintOrderListInput {
  storeName: string;
  /** Who the order is for; empty for a list with no supplier. */
  supplierName: string;
  supplierPhone: string | null;
  /** Already formatted for the reader. */
  dateLabel: string;
  currency: string;
  title: string;
  headers: { item: string; sku: string; stock: string; order: string; unitCost: string; cost: string };
  totalLabel: string;
  rows: PrintOrderListRow[];
  total: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const money = (value: number) => Math.round(value).toLocaleString("en-BD");

/**
 * Opens a clean, printable order sheet for one supplier in a new tab and
 * brings up the print dialog, where "Save as PDF" makes the file. Printing
 * from the browser (rather than building a PDF by hand) means Bangla and
 * English names both come out right. Every name is escaped before it goes
 * into the page.
 * @returns false when the browser blocked the new tab
 */
export function printOrderList(input: PrintOrderListInput): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;

  const rows = input.rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.name)}</td>
        <td class="mono">${escapeHtml(r.sku ?? "")}</td>
        <td class="num">${r.stock}</td>
        <td class="num strong">${r.order}</td>
        <td class="num">${escapeHtml(input.currency)}${money(r.unitCost)}</td>
        <td class="num">${escapeHtml(input.currency)}${money(r.cost)}</td>
      </tr>`,
    )
    .join("");

  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(input.title)}${input.supplierName ? ` — ${escapeHtml(input.supplierName)}` : ""}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, "Noto Sans Bengali", "Segoe UI", Arial, sans-serif; color: #111; margin: 32px; font-size: 13px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #555; margin-bottom: 18px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-bottom: 1px solid #ddd; padding: 7px 8px; text-align: left; vertical-align: top; }
  th { background: #f4f4f5; font-size: 12px; }
  .num { text-align: right; white-space: nowrap; }
  .strong { font-weight: 700; }
  .mono { font-family: ui-monospace, Consolas, monospace; font-size: 12px; color: #444; }
  .total { margin-top: 14px; text-align: right; font-size: 15px; font-weight: 700; }
  @media print { body { margin: 14mm; } }
</style>
</head>
<body>
  <h1>${escapeHtml(input.title)}</h1>
  <div class="meta">
    <div><strong>${escapeHtml(input.storeName)}</strong> · ${escapeHtml(input.dateLabel)}</div>
    ${input.supplierName ? `<div>${escapeHtml(input.supplierName)}${input.supplierPhone ? ` · ${escapeHtml(input.supplierPhone)}` : ""}</div>` : ""}
  </div>
  <table>
    <thead>
      <tr>
        <th>${escapeHtml(input.headers.item)}</th>
        <th>${escapeHtml(input.headers.sku)}</th>
        <th class="num">${escapeHtml(input.headers.stock)}</th>
        <th class="num">${escapeHtml(input.headers.order)}</th>
        <th class="num">${escapeHtml(input.headers.unitCost)}</th>
        <th class="num">${escapeHtml(input.headers.cost)}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">${escapeHtml(input.totalLabel)}: ${escapeHtml(input.currency)}${money(input.total)}</div>
</body>
</html>`);
  win.document.close();
  win.focus();
  // Let the page lay out before the print dialog opens.
  win.setTimeout(() => win.print(), 300);
  return true;
}
