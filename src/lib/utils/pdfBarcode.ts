/**
 * Draws a CODE128 barcode straight into a jsPDF document as vector
 * rectangles, instead of embedding it as a raster image — same technique,
 * and same reason, as drawQrVector in pdfQr.ts: a raster code gets run
 * through a thermal print bridge's photo-dithering step, which speckles
 * crisp bar edges and can break scanning entirely.
 */
import { JsPDFInstance } from "./pdfText";
import { encodeCode128B } from "./barcode128";

/** Draws a barcode `widthMm` wide and `heightMm` tall (the human-readable text line is drawn separately by the caller, not included in heightMm). */
export function drawBarcodeVector(
  doc: JsPDFInstance,
  value: string,
  xMm: number,
  yMm: number,
  widthMm: number,
  heightMm: number,
): void {
  const pattern = encodeCode128B(value);
  const moduleWidthMm = widthMm / pattern.modules;

  doc.setFillColor(255, 255, 255);
  doc.rect(xMm, yMm, widthMm, heightMm, "F");
  doc.setFillColor(0, 0, 0);
  for (let i = 0; i < pattern.modules; i++) {
    if (!pattern.isDark(i)) continue;
    doc.rect(xMm + i * moduleWidthMm, yMm, moduleWidthMm + 0.02, heightMm, "F");
  }
}
