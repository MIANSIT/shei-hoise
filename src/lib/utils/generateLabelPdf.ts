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
 */
import { JsPDFInstance, loadImageBase64, registerBengaliFont, setTextFont } from "./pdfText";

export interface LabelPdfData {
  storeName: string;
  logoUrl?: string | null;
  /** Pre-rendered PNG data URL (see renderProductQrDataUrl). */
  qrDataUrl: string;
  productName: string;
}

const LABEL_WIDTH_MM = 30;
const MARGIN_MM = 2;
const CONTENT_WIDTH_MM = LABEL_WIDTH_MM - MARGIN_MM * 2;
const QR_SIZE_MM = 22;
const BOTTOM_PADDING_MM = 2;

function drawLabel(
  doc: JsPDFInstance,
  data: LabelPdfData,
  bengaliLoaded: boolean,
  logo: { dataUrl: string; format: "PNG" | "JPEG" } | null,
): number {
  let y = 2.5;

  if (logo) {
    const logoSize = 3.5;
    doc.addImage(logo.dataUrl, logo.format, (LABEL_WIDTH_MM - logoSize) / 2, y, logoSize, logoSize);
    y += logoSize + 1;
  }

  doc.setFontSize(6);
  doc.setTextColor(85, 85, 85);
  setTextFont(doc, data.storeName, bengaliLoaded, false);
  doc.text(data.storeName, LABEL_WIDTH_MM / 2, y, { align: "center" });
  y += 3.2;

  doc.addImage(data.qrDataUrl, "PNG", (LABEL_WIDTH_MM - QR_SIZE_MM) / 2, y, QR_SIZE_MM, QR_SIZE_MM);
  y += QR_SIZE_MM + 1.5;

  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  setTextFont(doc, data.productName, bengaliLoaded, true);
  const nameLines: string[] = doc.splitTextToSize(data.productName, CONTENT_WIDTH_MM);
  nameLines.slice(0, 2).forEach((line: string, i: number) => {
    doc.text(line, LABEL_WIDTH_MM / 2, y + i * 2.6, { align: "center" });
  });
  y += Math.min(nameLines.length, 2) * 2.6;

  return y + BOTTOM_PADDING_MM;
}

export async function generateLabelPdf(data: LabelPdfData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");

  const logo = data.logoUrl ? await loadImageBase64(data.logoUrl) : null;

  // Pass 1: measure on a tall scratch page (jsPDF can't resize a page after
  // creation), same two-pass approach as generateReceiptPdf.ts.
  const scratch = new jsPDF({ unit: "mm", format: [LABEL_WIDTH_MM, 100] });
  const bengaliLoaded = await registerBengaliFont(scratch);
  const heightMm = drawLabel(scratch, data, bengaliLoaded, logo);

  // Pass 2: the real, correctly-sized document.
  const doc = new jsPDF({ unit: "mm", format: [LABEL_WIDTH_MM, heightMm] });
  await registerBengaliFont(doc);
  drawLabel(doc, data, bengaliLoaded, logo);

  return doc.output("blob");
}
