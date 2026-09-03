/**
 * Builds the Quick Sale POS receipt as a real PDF (jsPDF), with the 58mm
 * thermal-roll page size baked into the file itself.
 *
 * This replaces an earlier HTML + `@page { size: 58mm ... }` + browser
 * print() approach. That worked on desktop Chrome, but iOS Safari's print
 * engine ignores custom `@page` sizes entirely and always falls back to a
 * standard Letter/A4 page — no CSS can override that, and it got worse once
 * the result was saved as a PDF first (the wrong page size gets baked into
 * that file, so *any* app printing it afterwards inherits the mistake). A
 * real PDF's own page geometry isn't something the OS's print engine gets
 * to reinterpret, so this renders correctly everywhere: desktop, Android
 * print services (RawBT etc.), and iOS AirPrint.
 *
 * Text is drawn natively (not screenshotted via html2canvas) on purpose —
 * see exportSalesReport.ts's PDF section for why: a canvas screenshot
 * garbled the ৳ currency glyph.
 */

type JsPDFInstance = InstanceType<typeof import("jspdf").jsPDF>;

export interface ReceiptPdfItem {
  name: string;
  qty: number;
  amount: number;
}

export interface ReceiptPdfData {
  storeName: string;
  logoUrl?: string | null;
  dateLabel: string;
  orderNumber: string;
  items: ReceiptPdfItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentLabel: string;
  cashReceived: number | null;
  changeDue: number | null;
  paidNow: number | null;
  due: number | null;
  currencyIcon: string;
  /** Pre-rendered PNG data URL (see renderProductQrDataUrl) pointing at the store's storefront, or null to omit it. */
  shopQrDataUrl: string | null;
}

const PAGE_WIDTH_MM = 58;
const MARGIN_X_MM = 3;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_X_MM * 2;
const RIGHT_EDGE_MM = PAGE_WIDTH_MM - MARGIN_X_MM;
const BOTTOM_PADDING_MM = 4;

// ── Bengali font (browser-side) ──────────────────────────────────────────
// Mirrors exportSalesReport.ts's registerBengaliFontBrowser: the ৳ symbol
// (and any Bengali store/product name) needs this embedded, since jsPDF's
// built-in fonts have no glyph for it — a bare `pdf.text("৳80.00", ...)`
// would otherwise render with the glyph missing/blank.
const BENGALI_FONT_URL = "/fonts/NotoSansBengali-Regular.ttf";
let bengaliFontBase64Cache: string | null | undefined;

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

async function registerBengaliFont(pdf: JsPDFInstance): Promise<boolean> {
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

/** Sets the Bengali font if `text` needs it, otherwise falls back to Courier (this receipt's base font). Always restore with `pdf.setFont("courier", style)` after drawing. */
function setTextFont(pdf: JsPDFInstance, text: string, bengaliLoaded: boolean, bold: boolean): void {
  if (bengaliLoaded && hasBengaliChar(text)) {
    pdf.setFont("NotoSansBengali", "normal");
  } else {
    pdf.setFont("courier", bold ? "bold" : "normal");
  }
}

function amountText(icon: string, value: number): string {
  return `${icon}${value.toFixed(2)}`;
}

function loadImageBase64(url: string): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> {
  return fetch(url)
    .then((res) => (res.ok ? res.blob() : null))
    .then(
      (blob) =>
        blob &&
        new Promise<{ dataUrl: string; format: "PNG" | "JPEG" }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () =>
            resolve({
              dataUrl: reader.result as string,
              format: blob.type.includes("png") ? "PNG" : "JPEG",
            });
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }),
    )
    .catch(() => null); // best-effort — some store logos aren't served with CORS headers permissive enough for this (same caveat as elsewhere this app embeds a logo into a canvas/PDF)
}

function dashedLine(doc: JsPDFInstance, y: number): void {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.15);
  doc.setLineDashPattern([0.6, 0.6], 0);
  doc.line(MARGIN_X_MM, y, RIGHT_EDGE_MM, y);
  doc.setLineDashPattern([], 0);
}

function centeredText(
  doc: JsPDFInstance,
  text: string,
  y: number,
  fontSize: number,
  bold: boolean,
  bengaliLoaded: boolean,
  color: [number, number, number] = [0, 0, 0],
): void {
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  setTextFont(doc, text, bengaliLoaded, bold);
  doc.text(text, PAGE_WIDTH_MM / 2, y, { align: "center" });
}

/** One item line: name (left, wraps to multiple lines if long) with qty and amount on its first line. Returns the y position after this row. */
function itemRow(
  doc: JsPDFInstance,
  y: number,
  item: ReceiptPdfItem,
  currencyIcon: string,
  bengaliLoaded: boolean,
): number {
  const fontSize = 7.5;
  const lineH = 3.3;
  const nameColWidthMm = CONTENT_WIDTH_MM * 0.58;

  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);
  doc.setFont("courier", "normal");
  const nameLines: string[] = doc.splitTextToSize(item.name, nameColWidthMm);
  nameLines.forEach((line: string, i: number) => {
    setTextFont(doc, line, bengaliLoaded, false);
    doc.text(line, MARGIN_X_MM, y + i * lineH);
  });

  doc.setFont("courier", "normal");
  doc.text(`x${item.qty}`, MARGIN_X_MM + nameColWidthMm + 4, y);

  const amt = amountText(currencyIcon, item.amount);
  setTextFont(doc, amt, bengaliLoaded, false);
  doc.text(amt, RIGHT_EDGE_MM, y, { align: "right" });

  return y + Math.max(nameLines.length, 1) * lineH + 0.6;
}

/** A "label ... amount" totals row. Returns the y position after this row. */
function totalRow(
  doc: JsPDFInstance,
  y: number,
  label: string,
  amount: string,
  bold: boolean,
  fontSize: number,
  bengaliLoaded: boolean,
): number {
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);
  doc.setFont("courier", bold ? "bold" : "normal");
  doc.text(label, MARGIN_X_MM, y);
  setTextFont(doc, amount, bengaliLoaded, bold);
  doc.text(amount, RIGHT_EDGE_MM, y, { align: "right" });
  return y + (bold ? 4.4 : 3.6);
}

/** Draws one full receipt copy starting at y=0 on the given (already correctly-sized) page. Returns the total height used, in mm. */
function drawReceiptCopy(
  doc: JsPDFInstance,
  data: ReceiptPdfData,
  copyLabel: "CUSTOMER COPY" | "SHOP COPY",
  bengaliLoaded: boolean,
  logo: { dataUrl: string; format: "PNG" | "JPEG" } | null,
): number {
  let y = 4;

  centeredText(doc, `— ${copyLabel} —`, y, 6.5, true, bengaliLoaded, [80, 80, 80]);
  y += 4;

  if (logo) {
    const logoSize = 9;
    doc.addImage(logo.dataUrl, logo.format, (PAGE_WIDTH_MM - logoSize) / 2, y, logoSize, logoSize);
    y += logoSize + 1.5;
  }

  centeredText(doc, data.storeName, y, 10, true, bengaliLoaded);
  y += 4.5;

  centeredText(doc, data.dateLabel, y, 7.5, false, bengaliLoaded);
  y += 3.6;

  centeredText(doc, `#${data.orderNumber}`, y, 7.5, false, bengaliLoaded);
  y += 4;

  dashedLine(doc, y);
  y += 3.4;

  for (const item of data.items) {
    y = itemRow(doc, y, item, data.currencyIcon, bengaliLoaded);
  }

  y += 0.4;
  dashedLine(doc, y);
  y += 3.8;

  y = totalRow(doc, y, "Subtotal", amountText(data.currencyIcon, data.subtotal), false, 7.5, bengaliLoaded);
  y = totalRow(doc, y, "Discount", amountText(data.currencyIcon, data.discount), false, 7.5, bengaliLoaded);
  dashedLine(doc, y - 1);
  y = totalRow(doc, y + 0.8, "TOTAL", amountText(data.currencyIcon, data.total), true, 9, bengaliLoaded);
  y = totalRow(doc, y, "Payment", data.paymentLabel, false, 7.5, bengaliLoaded);

  if (data.cashReceived != null) {
    y = totalRow(doc, y, "Cash received", amountText(data.currencyIcon, data.cashReceived), false, 7.5, bengaliLoaded);
    y = totalRow(doc, y, "Change due", amountText(data.currencyIcon, data.changeDue ?? 0), false, 7.5, bengaliLoaded);
  }

  if (data.due != null && data.due > 0.01) {
    y = totalRow(doc, y, "Paid now", amountText(data.currencyIcon, data.paidNow ?? 0), false, 7.5, bengaliLoaded);
    y = totalRow(doc, y, "DUE", amountText(data.currencyIcon, data.due), true, 7.5, bengaliLoaded);
  }

  y += 1.5;

  if (data.shopQrDataUrl) {
    const qrSize = 16;
    doc.addImage(data.shopQrDataUrl, "PNG", (PAGE_WIDTH_MM - qrSize) / 2, y, qrSize, qrSize);
    y += qrSize + 1.5;
    centeredText(doc, "Shop with us online", y, 6.5, false, bengaliLoaded, [100, 100, 100]);
    y += 4;
  }

  centeredText(doc, "Thank you for shopping with us!", y, 7, false, bengaliLoaded, [60, 60, 60]);
  y += 4;

  if (copyLabel === "CUSTOMER COPY") {
    // Fallback tear guide for printers without an auto-cutter — the two
    // copies are separate PDF pages (see generateReceiptPdf), so a printer
    // with an auto-cutter separates them on its own regardless.
    centeredText(doc, "- - - - - cut here - - - - -", y, 6.5, false, false, [110, 110, 110]);
    y += 3;
  }

  return y + BOTTOM_PADDING_MM;
}

export async function generateReceiptPdf(data: ReceiptPdfData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");

  const logo = data.logoUrl ? await loadImageBase64(data.logoUrl) : null;

  // Pass 1: jsPDF has no supported way to resize a page after creation, so
  // the exact content height has to be known before constructing the real
  // document. A tall scratch page runs the same layout purely to measure it.
  const scratch = new jsPDF({ unit: "mm", format: [PAGE_WIDTH_MM, 400] });
  const bengaliLoaded = await registerBengaliFont(scratch);
  const pageHeightMm = drawReceiptCopy(scratch, data, "CUSTOMER COPY", bengaliLoaded, logo);

  // Pass 2: the real, correctly-sized document (font registration is
  // per-instance, so it's repeated here).
  const doc = new jsPDF({ unit: "mm", format: [PAGE_WIDTH_MM, pageHeightMm] });
  await registerBengaliFont(doc);
  drawReceiptCopy(doc, data, "CUSTOMER COPY", bengaliLoaded, logo);
  doc.addPage([PAGE_WIDTH_MM, pageHeightMm]);
  drawReceiptCopy(doc, data, "SHOP COPY", bengaliLoaded, logo);

  return doc.output("blob");
}
