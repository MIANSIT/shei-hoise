import type { SubscriptionInvoice } from "@/lib/queries/subscription/getStoreSubscription";
import { CONTACT_INFO } from "@/lib/store/contact";
import dayjs from "dayjs";

// ── Palette ───────────────────────────────────────────────────────────────────
const NAVY   = [15,  23,  42]  as const; // slate-900
const WHITE  = [255, 255, 255] as const;
const S400   = [148, 163, 184] as const; // slate-400
const S500   = [100, 116, 139] as const; // slate-500
const S600   = [71,  85,  105] as const; // slate-600
const S800   = [30,  41,  59]  as const; // slate-800
const S100   = [241, 245, 249] as const; // slate-100
const S50    = [248, 250, 252] as const; // slate-50

// ── Public types ──────────────────────────────────────────────────────────────
export interface StoreInfo {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(iso: string | null): string {
  if (!iso) return "—";
  return dayjs(iso).format("MMM D, YYYY");
}

function fmtAmount(amount: number, currency: string): string {
  return `${currency.trim()} ${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    paid: "PAID", pending: "PENDING", failed: "FAILED",
    cancelled: "CANCELLED", refunded: "REFUNDED",
    overdue: "OVERDUE", unpaid: "UN PAID",
  };
  return map[status] ?? status.toUpperCase();
}

function statusRGB(status: string): [number, number, number] {
  switch (status) {
    case "paid":                       return [22,  163, 74];
    case "pending":                    return [217, 119, 6];
    case "failed": case "overdue":
    case "unpaid":                     return [220, 38,  38];
    case "refunded":                   return [124, 58,  237];
    default:                           return [100, 116, 139];
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch("/logo_beta.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function downloadInvoicePdf(
  invoice: SubscriptionInvoice,
  store: StoreInfo,
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }, logo] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    loadLogo(),
  ]);

  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW   = 210;  // page width
  const M    = 16;   // margin
  const MID  = PW / 2;
  const colL = M;
  const colR = MID + 6;

  // ── 1. DARK HEADER (0 → 46mm) ────────────────────────────────────────────
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, PW, 46, "F");

  // Logo
  let txX = M;
  if (logo) {
    doc.addImage(logo, "PNG", M, 11, 20, 11);
    txX = M + 23;
  }

  // Company name block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text("Shei Hoise", txX, 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(S400[0], S400[1], S400[2]);
  doc.text("All in One Solution", txX, 25);

  // INVOICE block (right-aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text("INVOICE", PW - M, 21, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(S400[0], S400[1], S400[2]);
  doc.text(`# ${invoice.invoice_number}`, PW - M, 28, { align: "right" });
  doc.text(`Issued  ${dayjs().format("MMM D, YYYY")}`, PW - M, 34, { align: "right" });

  // ── 2. FROM  /  BILLED TO (52 → ~90mm) ───────────────────────────────────
  const sectionLabel = (text: string, x: number, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(S500[0], S500[1], S500[2]);
    doc.text(text, x, y);
  };

  let lY = 56;
  let rY = 56;

  sectionLabel("FROM", colL, 53);
  sectionLabel("BILLED  TO", colR, 53);

  // Left: Shei Hoise (vendor/issuer)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(S800[0], S800[1], S800[2]);
  doc.text("Shei Hoise", colL, lY);
  lY += 7;

  const vendorLines = [CONTACT_INFO.email, CONTACT_INFO.phone, CONTACT_INFO.address];
  vendorLines.forEach((line) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(S600[0], S600[1], S600[2]);
    doc.text(line, colL, lY, { maxWidth: MID - M - 6 });
    lY += 5.5;
  });

  // Right: Store (customer being billed)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(S800[0], S800[1], S800[2]);
  doc.text(store.name, colR, rY, { maxWidth: PW - colR - M });
  rY += 7;

  const storeLines: string[] = [
    store.email ?? "",
    store.phone ?? "",
    store.address ?? "",
  ].filter(Boolean);

  storeLines.forEach((line) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(S600[0], S600[1], S600[2]);
    doc.text(line, colR, rY, { maxWidth: PW - colR - M });
    rY += 5.5;
  });

  // ── 3. SEPARATOR ─────────────────────────────────────────────────────────
  const sep1Y = Math.max(lY, rY) + 5;
  doc.setDrawColor(S100[0], S100[1], S100[2]);
  doc.setLineWidth(0.5);
  doc.line(M, sep1Y, PW - M, sep1Y);

  // ── 4. INVOICE DETAILS BAR ────────────────────────────────────────────────
  // Light slate-50 background strip
  const barY  = sep1Y + 4;
  const barH  = 22;
  doc.setFillColor(S50[0], S50[1], S50[2]);
  doc.roundedRect(M, barY, PW - M * 2, barH, 2, 2, "F");

  // Status badge
  const [sr, sg, sb] = statusRGB(invoice.status);
  const badge  = statusLabel(invoice.status);
  const badgeW = Math.max(badge.length * 1.9 + 9, 22);
  const badgeX = M + 5;
  const badgeMidY = barY + barH / 2;
  doc.setFillColor(sr, sg, sb);
  doc.roundedRect(badgeX, badgeMidY - 4, badgeW, 8, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text(badge, badgeX + badgeW / 2, badgeMidY + 0.8, { align: "center" });

  // Detail cells: Billing Cycle | Period | Due Date | Paid At
  const detailCells: [string, string][] = [
    ["Billing Cycle", cap(invoice.billing_cycle)],
    ["Period", `${fmt(invoice.period_start)} – ${fmt(invoice.period_end)}`],
    ["Due Date", fmt(invoice.due_date)],
    ...(invoice.paid_at ? [["Paid At", fmt(invoice.paid_at)] as [string, string]] : []),
  ];

  const cellsStart = badgeX + badgeW + 8;
  const cellsWidth = PW - M - cellsStart;
  const cellW      = cellsWidth / detailCells.length;

  detailCells.forEach(([label, value], idx) => {
    const cx = cellsStart + idx * cellW;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(S500[0], S500[1], S500[2]);
    doc.text(label, cx, barY + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(S800[0], S800[1], S800[2]);
    doc.text(value, cx, barY + 15, { maxWidth: cellW - 3 });
  });

  // ── 5. ITEMS TABLE ────────────────────────────────────────────────────────
  const tableY = barY + barH + 6;

  autoTable(doc, {
    startY: tableY,
    head: [["Description", "Billing Cycle", "Amount"]],
    body: [[
      `${invoice.plan_name} Subscription`,
      cap(invoice.billing_cycle),
      fmtAmount(invoice.amount, invoice.currency),
    ]],
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: { top: 5, right: 7, bottom: 5, left: 7 },
    },
    headStyles: {
      fillColor: [NAVY[0], NAVY[1], NAVY[2]],
      textColor: [WHITE[0], WHITE[1], WHITE[2]],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fillColor: [S50[0], S50[1], S50[2]],
      textColor: [S800[0], S800[1], S800[2]],
    },
    alternateRowStyles: { fillColor: [WHITE[0], WHITE[1], WHITE[2]] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 34, halign: "center" },
      2: { cellWidth: 44, halign: "right", fontStyle: "bold" },
    },
    tableLineColor: [S100[0], S100[1], S100[2]],
    tableLineWidth: 0.25,
    margin: { left: M, right: M },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableEnd = (doc as any).lastAutoTable?.finalY ?? 155;

  // ── 6. TOTAL DUE BOX ──────────────────────────────────────────────────────
  const boxW = 88;
  const boxH = 22;
  const boxX = PW - M - boxW;
  const boxY = tableEnd + 7;

  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2.5, 2.5, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(S400[0], S400[1], S400[2]);
  doc.text("TOTAL  DUE", boxX + 10, boxY + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text(fmtAmount(invoice.amount, invoice.currency), boxX + 10, boxY + 17);

  // ── 7. SUPPLEMENTARY DETAILS ──────────────────────────────────────────────
  let extraY = boxY + boxH + 10;

  const drawExtra = (label: string, value: string, italic = false) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(S500[0], S500[1], S500[2]);
    doc.text(label, M, extraY);
    doc.setFont("helvetica", italic ? "italic" : "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(S800[0], S800[1], S800[2]);
    doc.text(value, M, extraY + 4.5, { maxWidth: PW - M * 2 - 10 });
    extraY += 13;
  };

  if (invoice.payment_method)
    drawExtra(
      "Payment Method",
      invoice.payment_method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    );
  if (invoice.payment_reference) drawExtra("Reference", invoice.payment_reference);
  if (invoice.notes)             drawExtra("Notes", invoice.notes, true);

  // ── 8. FOOTER ─────────────────────────────────────────────────────────────
  const footY = 270;

  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, footY, PW, 297 - footY, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text("Shei Hoise", PW / 2, footY + 12, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(S400[0], S400[1], S400[2]);
  doc.text(
    `${CONTACT_INFO.email}   ·   ${CONTACT_INFO.phone}`,
    PW / 2, footY + 18, { align: "center" },
  );
  doc.text(
    CONTACT_INFO.address,
    PW / 2, footY + 23, { align: "center", maxWidth: PW - M * 2 },
  );

  doc.save(`invoice-${invoice.invoice_number}.pdf`);
}
