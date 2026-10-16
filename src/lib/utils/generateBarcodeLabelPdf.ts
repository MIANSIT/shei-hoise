/**
 * Builds a product barcode label as a real PDF (jsPDF) sized to a standard
 * 50×32mm barcode sticker sheet — a fixed physical size, not the variable-
 * height 58mm thermal-roll layout used by generateLabelPdf.ts (QR labels),
 * since a barcode sticker is cut to a fixed size, not printed on a
 * continuous roll. Same "bake the exact size into the file" reasoning as
 * that file: a custom HTML `@page` size is frequently ignored by mobile
 * print engines and label-printer bridge apps in favor of a bigger default
 * page, which is exactly the "prints tiny in one corner" failure this avoids.
 */
import { JsPDFInstance, loadImageBase64, registerBengaliFont, setTextFont } from "./pdfText";
import { drawBarcodeVector } from "./pdfBarcode";
import { encodeCode128B } from "./barcode128";
import { enableBengaliText } from "@/lib/pdf/bengaliPdfText";
import { loadBengaliFontBrowser } from "@/lib/pdf/bengaliFontBrowser";

export interface BarcodeLabelData {
  storeName: string;
  logoUrl?: string | null;
  /** The SKU (or other CODE128-encodable text) the barcode represents. */
  sku: string;
  productName: string;
}

// The label size the user asked for: 50 × 32mm, ratio 1.5625:1.
const PAGE_WIDTH_MM = 50;
const PAGE_HEIGHT_MM = 32;
const MARGIN_MM = 2;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;

// Bar widths are snapped to whole multiples of 0.254mm: that is exactly 2
// dots on a 203dpi label printer and 3 dots on a 300dpi one, so every bar
// prints the same width. A free-floating width (e.g. 0.317mm = 2.5 dots)
// makes some bars 2 dots and others 3, which reads as a smeared/broken
// barcode. Below one step the bars are too thin to print or scan, so a SKU
// needing more modules than fit at one step is "too long" for this label.
const MODULE_STEP_MM = 0.254;
const BARCODE_HEIGHT_MM = 11;

/** Widest whole-dot module width that fits `sku` in the label, or 0 if even one step doesn't fit. */
function fittingModuleWidthMm(sku: string): number {
  const steps = Math.floor(CONTENT_WIDTH_MM / (encodeCode128B(sku).modules * MODULE_STEP_MM));
  return steps * MODULE_STEP_MM;
}

/**
 * True if `sku` needs more modules than fit at the minimum printable bar
 * width on this label — the printed bars would come out too thin to
 * reproduce distinctly, which reads as a "broken" barcode on paper even
 * though the encoded data is correct. Digit runs are already compressed
 * (CODE128 subset C); beyond that the fix is a shorter SKU.
 */
export function isSkuTooLongForBarcodeLabel(sku: string): boolean {
  return fittingModuleWidthMm(sku) === 0;
}

function drawLabel(
  doc: JsPDFInstance,
  data: BarcodeLabelData,
  bengaliLoaded: boolean,
  logo: { dataUrl: string; format: "PNG" | "JPEG" } | null,
): void {
  let y = MARGIN_MM;

  if (logo) {
    const logoSize = 3.2;
    doc.addImage(logo.dataUrl, logo.format, (PAGE_WIDTH_MM - logoSize) / 2, y, logoSize, logoSize);
    y += logoSize + 0.8;
  }

  doc.setFontSize(6);
  doc.setTextColor(85, 85, 85);
  setTextFont(doc, data.storeName, bengaliLoaded, false);
  doc.text(data.storeName, PAGE_WIDTH_MM / 2, y + 1.8, { align: "center" });
  y += 3.6;

  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  setTextFont(doc, data.productName, bengaliLoaded, true);
  const nameLines: string[] = doc.splitTextToSize(data.productName, CONTENT_WIDTH_MM);
  doc.text(nameLines[0], PAGE_WIDTH_MM / 2, y + 1.8, { align: "center" });
  y += 3.6;

  // Widest whole-dot module that fits, centred so the quiet zone is equal on
  // both sides. A SKU too long even for one step (see
  // isSkuTooLongForBarcodeLabel) still gets a best-effort barcode here, but
  // the caller should have already warned that it may not scan reliably.
  const moduleWidthMm = fittingModuleWidthMm(data.sku) || MODULE_STEP_MM;
  const barcodeWidthMm = encodeCode128B(data.sku).modules * moduleWidthMm;
  drawBarcodeVector(doc, data.sku, (PAGE_WIDTH_MM - barcodeWidthMm) / 2, y, moduleWidthMm, BARCODE_HEIGHT_MM);
  y += BARCODE_HEIGHT_MM + 1.5;

  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  setTextFont(doc, data.sku, bengaliLoaded, false);
  doc.text(data.sku, PAGE_WIDTH_MM / 2, y + 1.5, { align: "center" });
}

export async function generateBarcodeLabelPdf(data: BarcodeLabelData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const logo = data.logoUrl ? await loadImageBase64(data.logoUrl) : null;

  // orientation must be explicit here — jsPDF defaults to portrait, and when
  // a custom format array is wider than it is tall (our 50×32mm) it silently
  // *swaps* width and height to force that default rather than erroring,
  // turning the intended landscape sticker into a 32×50mm portrait page with
  // every element positioned past the actual (now much narrower) right edge.
  const doc = new jsPDF({ unit: "mm", format: [PAGE_WIDTH_MM, PAGE_HEIGHT_MM], orientation: "landscape" });
  enableBengaliText(doc, await loadBengaliFontBrowser());
  const bengaliLoaded = await registerBengaliFont(doc);
  drawLabel(doc, data, bengaliLoaded, logo);

  return doc.output("blob");
}

/** One label's worth of data for {@link generateBulkBarcodeLabelPdf} — store name/logo are shared, only what differs per label is passed per item. */
export interface BulkBarcodeLabelItem {
  sku: string;
  productName: string;
}

/**
 * Same label as {@link generateBarcodeLabelPdf}, one page per item, for
 * printing a whole selection as a single file — every page fixed at the
 * same 50×32mm sticker size (unlike the QR bulk labels, a barcode sticker's
 * page size never varies with content, so there's no measure-then-draw
 * two-pass step needed here).
 */
export async function generateBulkBarcodeLabelPdf(
  storeName: string,
  logoUrl: string | null | undefined,
  items: BulkBarcodeLabelItem[],
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const logo = logoUrl ? await loadImageBase64(logoUrl) : null;

  // orientation must be explicit here too — see generateBarcodeLabelPdf's
  // comment on the same line; addPage() has the identical swap behavior for
  // every page after the first.
  const doc = new jsPDF({ unit: "mm", format: [PAGE_WIDTH_MM, PAGE_HEIGHT_MM], orientation: "landscape" });
  enableBengaliText(doc, await loadBengaliFontBrowser());
  const bengaliLoaded = await registerBengaliFont(doc);

  items.forEach((item, i) => {
    if (i > 0) doc.addPage([PAGE_WIDTH_MM, PAGE_HEIGHT_MM], "landscape");
    drawLabel(doc, { storeName, logoUrl, sku: item.sku, productName: item.productName }, bengaliLoaded, logo);
  });

  return doc.output("blob");
}
