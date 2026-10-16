/**
 * Draws a CODE128 barcode straight into a jsPDF document as vector
 * rectangles, instead of embedding it as a raster image — same technique,
 * and same reason, as drawQrVector in pdfQr.ts: a raster code gets run
 * through a thermal print bridge's photo-dithering step, which speckles
 * crisp bar edges and can break scanning entirely.
 */
import { JsPDFInstance } from "./pdfText";
import { encodeCode128B } from "./barcode128";

/**
 * Draws a barcode whose narrowest bar is `moduleWidthMm` wide, left edge at
 * `xMm`, `heightMm` tall (the human-readable text line is drawn separately by
 * the caller, not included in heightMm). Callers pick a module width that is a
 * whole number of printer dots, so every bar prints at the same width.
 * Returns the total drawn width so the caller can centre it.
 */
export function drawBarcodeVector(
  doc: JsPDFInstance,
  value: string,
  xMm: number,
  yMm: number,
  moduleWidthMm: number,
  heightMm: number,
): number {
  const pattern = encodeCode128B(value);

  // Adjacent dark modules are merged into one rectangle so no hairline gaps
  // appear between them and bar edges stay exactly on the module grid.
  doc.setFillColor(0, 0, 0);
  let runStart = -1;
  for (let i = 0; i <= pattern.modules; i++) {
    const dark = i < pattern.modules && pattern.isDark(i);
    if (dark && runStart < 0) runStart = i;
    if (!dark && runStart >= 0) {
      doc.rect(xMm + runStart * moduleWidthMm, yMm, (i - runStart) * moduleWidthMm, heightMm, "F");
      runStart = -1;
    }
  }
  return pattern.modules * moduleWidthMm;
}
