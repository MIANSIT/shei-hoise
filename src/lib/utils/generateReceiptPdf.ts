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

import {
  JsPDFInstance,
  loadImageBase64,
  registerBengaliFont,
  setTextFont,
} from "./pdfText";
import { drawQrVector, minQrSizeMm } from "./pdfQr";

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
  /** The customer identified for a due sale (collected so the balance can be traced back to them later) — omitted/blank for a fully-paid sale, so only printed alongside the DUE line below. */
  customerName?: string | null;
  customerPhone?: string | null;
  currencyIcon: string;
  /** URL to encode in the "shop with us online" QR (see getStorePublicUrl), or null to omit it — drawn as vector rectangles, not a raster image (see pdfQr.ts). */
  shopQrUrl: string | null;
}

const PAGE_WIDTH_MM = 58;
const MARGIN_X_MM = 3;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_X_MM * 2;
const RIGHT_EDGE_MM = PAGE_WIDTH_MM - MARGIN_X_MM;
const BOTTOM_PADDING_MM = 4;

function amountText(icon: string, value: number): string {
  return `${icon}${value.toFixed(2)}`;
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
    // `doc.text()` below draws at its y as a baseline, and a 10pt bold
    // font's glyphs reach ~2.5-3mm above that baseline — a 1.5mm gap after
    // the logo's bottom edge put the store name's letters back up inside
    // the logo image. Needs enough clearance for that ascender plus margin.
    y += logoSize + 4.5;
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
  y += 1;
  dashedLine(doc, y);
  // TOTAL is drawn larger/bolder (9pt) than the rows around it — needs more
  // clearance above its baseline than the ~3.6mm row height those use, or
  // its taller glyphs poke up through the dashed line just above.
  y += 3.2;
  y = totalRow(doc, y, "TOTAL", amountText(data.currencyIcon, data.total), true, 9, bengaliLoaded);
  y = totalRow(doc, y, "Payment", data.paymentLabel, false, 7.5, bengaliLoaded);

  if (data.cashReceived != null) {
    y = totalRow(doc, y, "Cash received", amountText(data.currencyIcon, data.cashReceived), false, 7.5, bengaliLoaded);
    y = totalRow(doc, y, "Change due", amountText(data.currencyIcon, data.changeDue ?? 0), false, 7.5, bengaliLoaded);
  }

  if (data.due != null && data.due > 0.01) {
    // "Paid now" only for a genuine partial payment — a fully-due sale (₹0
    // collected up front) has nothing paid to report, so skip straight to
    // DUE rather than printing a "Paid now ৳0.00" line.
    if (data.paidNow != null && data.paidNow > 0.01) {
      y = totalRow(doc, y, "Paid now", amountText(data.currencyIcon, data.paidNow), false, 7.5, bengaliLoaded);
    }
    y = totalRow(doc, y, "DUE", amountText(data.currencyIcon, data.due), true, 7.5, bengaliLoaded);
    if (data.customerName) {
      y = totalRow(doc, y, "Customer", data.customerName, false, 7.5, bengaliLoaded);
    }
    if (data.customerPhone) {
      y = totalRow(doc, y, "Phone", data.customerPhone, false, 7.5, bengaliLoaded);
    }
  }

  y += 3;

  if (data.shopQrUrl) {
    // At least 25-30mm is the recommended minimum for reliable scanning
    // through a thermal print pipeline — a wider receipt has the room, and
    // a bigger physical QR means bigger physical modules. Sized off the
    // actual URL (not a bare constant) so a longer store slug automatically
    // gets a bigger QR too, keeping the module size — not just the overall
    // size — consistent with what's confirmed scanning correctly (see
    // pdfQr.ts's minQrSizeMm). The QR's own quiet zone (4 modules, drawn as
    // part of it) already satisfies the QR spec, but a few extra mm of
    // surrounding whitespace here keeps any nearby text further clear too.
    const qrSize = Math.min(45, Math.max(30, minQrSizeMm(data.shopQrUrl, 0.8)));
    drawQrVector(doc, data.shopQrUrl, (PAGE_WIDTH_MM - qrSize) / 2, y, qrSize);
    y += qrSize + 3;
    centeredText(doc, "Shop with us online", y, 6.5, false, bengaliLoaded, [100, 100, 100]);
    y += 4;
  }

  centeredText(doc, "Thank you for shopping with us!", y, 7, false, bengaliLoaded, [60, 60, 60]);
  y += 4;

  return y + BOTTOM_PADDING_MM;
}

export interface ReceiptPdfSet {
  /** Both copies as one 2-page PDF — used for the on-screen preview and Share, where a single file covering the whole sale reads naturally. */
  combined: Blob;
  /** Copies as separate single-page PDFs — printed as independent jobs, since a cheap thermal print bridge (RawBT etc.) may only ever send page 1 of a multi-page PDF, or the OS print sheet closes after the first job with no way back to page 2. */
  customerCopy: Blob;
  shopCopy: Blob;
}

export async function generateReceiptPdfSet(data: ReceiptPdfData): Promise<ReceiptPdfSet> {
  const { jsPDF } = await import("jspdf");

  const logo = data.logoUrl ? await loadImageBase64(data.logoUrl) : null;

  // Pass 1: jsPDF has no supported way to resize a page after creation, so
  // the exact content height has to be known before constructing the real
  // document. A tall scratch page runs the same layout purely to measure it.
  const scratch = new jsPDF({ unit: "mm", format: [PAGE_WIDTH_MM, 400] });
  const bengaliLoaded = await registerBengaliFont(scratch);
  const pageHeightMm = drawReceiptCopy(scratch, data, "CUSTOMER COPY", bengaliLoaded, logo);
  const pageFormat: [number, number] = [PAGE_WIDTH_MM, pageHeightMm];

  // Pass 2: the real, correctly-sized documents (font registration is
  // per-instance, so it's repeated on each one).
  const combinedDoc = new jsPDF({ unit: "mm", format: pageFormat });
  await registerBengaliFont(combinedDoc);
  drawReceiptCopy(combinedDoc, data, "CUSTOMER COPY", bengaliLoaded, logo);
  combinedDoc.addPage(pageFormat);
  drawReceiptCopy(combinedDoc, data, "SHOP COPY", bengaliLoaded, logo);

  const customerDoc = new jsPDF({ unit: "mm", format: pageFormat });
  await registerBengaliFont(customerDoc);
  drawReceiptCopy(customerDoc, data, "CUSTOMER COPY", bengaliLoaded, logo);

  const shopDoc = new jsPDF({ unit: "mm", format: pageFormat });
  await registerBengaliFont(shopDoc);
  drawReceiptCopy(shopDoc, data, "SHOP COPY", bengaliLoaded, logo);

  return {
    combined: combinedDoc.output("blob"),
    customerCopy: customerDoc.output("blob"),
    shopCopy: shopDoc.output("blob"),
  };
}
