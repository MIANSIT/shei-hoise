/**
 * Builds a single product QR label as a real PDF (jsPDF), the label's exact
 * physical size baked into the file itself — same technique, and same
 * reason, as generateReceiptPdf.ts: printing this as HTML with a custom
 * `@page { size: ... }` rule instead works on desktop Chrome, but mobile
 * print engines (and print-bridge apps for Bluetooth thermal/label
 * printers) frequently ignore a custom `@page` size and substitute a much
 * bigger default page, so the label ends up tiny and mis-scaled in one
 * corner of it — exactly the "prints to the side, blurry" failure this
 * replaces.
 *
 * PAGE_WIDTH_MM matches the receipt's (58mm), not some smaller dedicated
 * label-stock width — because on the hardware actually in use, there is no
 * separate narrower label roll, just the same continuous 58mm thermal roll
 * as receipts. A page narrower than the physical paper leaves the print
 * pipeline free to place our content anywhere within the leftover width,
 * inconsistently — which is exactly the "prints to one side" symptom this
 * fixes. Declaring the full physical width and centering within it (same
 * as the receipt) removes that ambiguity entirely.
 */
import { JsPDFInstance, loadImageBase64, registerBengaliFont, setTextFont } from "./pdfText";
import { drawQrVector, minQrSizeMm } from "./pdfQr";

export interface LabelPdfData {
  storeName: string;
  logoUrl?: string | null;
  /** URL the QR encodes — drawn as vector rectangles, not a raster image (see pdfQr.ts). */
  qrUrl: string;
  productName: string;
}

const PAGE_WIDTH_MM = 58;
const MARGIN_MM = 3;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
// A product URL is longer than the receipt's store-home-page URL, so it
// needs more QR modules for the same data — a size that scans fine for a
// short URL can still be too dense at a longer one. Sizing off the actual
// URL keeps every label's module size at least as generous as what's now
// confirmed working on the receipt (~0.8mm/module at 30mm for a short
// URL), instead of one fixed size that only works for short product names.
const MIN_MODULE_SIZE_MM = 0.8;
const MIN_QR_SIZE_MM = 30;
const MAX_QR_SIZE_MM = 45; // stays inside the 52mm content width with margin
const BOTTOM_PADDING_MM = 3;

function drawLabel(
  doc: JsPDFInstance,
  data: LabelPdfData,
  bengaliLoaded: boolean,
  logo: { dataUrl: string; format: "PNG" | "JPEG" } | null,
): number {
  let y = 3;

  if (logo) {
    const logoSize = 4;
    doc.addImage(logo.dataUrl, logo.format, (PAGE_WIDTH_MM - logoSize) / 2, y, logoSize, logoSize);
    y += logoSize + 1.2;
  }

  doc.setFontSize(7);
  doc.setTextColor(85, 85, 85);
  setTextFont(doc, data.storeName, bengaliLoaded, false);
  doc.text(data.storeName, PAGE_WIDTH_MM / 2, y, { align: "center" });
  y += 4.5;

  // Extra whitespace beyond the QR's own built-in quiet zone (see
  // pdfQr.ts) — keeps the store name/product name text clear of it too.
  const qrSizeMm = Math.min(
    MAX_QR_SIZE_MM,
    Math.max(MIN_QR_SIZE_MM, minQrSizeMm(data.qrUrl, MIN_MODULE_SIZE_MM)),
  );
  drawQrVector(doc, data.qrUrl, (PAGE_WIDTH_MM - qrSizeMm) / 2, y, qrSizeMm);
  y += qrSizeMm + 3;

  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  setTextFont(doc, data.productName, bengaliLoaded, true);
  const nameLines: string[] = doc.splitTextToSize(data.productName, CONTENT_WIDTH_MM);
  nameLines.slice(0, 2).forEach((line: string, i: number) => {
    doc.text(line, PAGE_WIDTH_MM / 2, y + i * 3, { align: "center" });
  });
  y += Math.min(nameLines.length, 2) * 3;

  return y + BOTTOM_PADDING_MM;
}

export async function generateLabelPdf(data: LabelPdfData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");

  const logo = data.logoUrl ? await loadImageBase64(data.logoUrl) : null;

  // Pass 1: measure on a tall scratch page (jsPDF can't resize a page after
  // creation), same two-pass approach as generateReceiptPdf.ts.
  const scratch = new jsPDF({ unit: "mm", format: [PAGE_WIDTH_MM, 100] });
  const bengaliLoaded = await registerBengaliFont(scratch);
  const heightMm = drawLabel(scratch, data, bengaliLoaded, logo);

  // Pass 2: the real, correctly-sized document.
  const doc = new jsPDF({ unit: "mm", format: [PAGE_WIDTH_MM, heightMm] });
  await registerBengaliFont(doc);
  drawLabel(doc, data, bengaliLoaded, logo);

  return doc.output("blob");
}
