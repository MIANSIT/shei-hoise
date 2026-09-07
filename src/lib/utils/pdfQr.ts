/**
 * Draws a QR code straight into a jsPDF document as vector rectangles,
 * instead of embedding it as a raster image — see getQrModuleMatrix in
 * productQr.ts for why that distinction is what actually makes a printed QR
 * scannable on a thermal print bridge.
 *
 * No logo here (unlike the on-screen canvas QR in productQr.ts): embedding
 * one forces error-correction level "H", which on a real product URL adds
 * enough extra modules to shrink each one well below what most scanners can
 * resolve through a lossy thermal print pipeline. Dropping the logo and
 * using "M" instead measurably grows every module (see getQrModuleMatrix's
 * doc comment) — worth more for actual scannability than the branding.
 */
import { JsPDFInstance } from "./pdfText";
import { getQrModuleMatrix } from "./productQr";

// ISO/IEC 18004's minimum quiet zone, in modules — must match the margin
// used by the on-screen/canvas QR renders in productQr.ts so both paths
// produce the same visual proportions.
const QUIET_ZONE_MODULES = 4;

// A hair of overlap between adjacent same-color module rects, so
// floating-point rounding in the PDF renderer can't leave a 1px white
// hairline between them — imperceptible at any print resolution.
const MODULE_OVERLAP_MM = 0.02;

/** Draws a `sizeMm × sizeMm` QR (quiet zone included in that size) at (xMm, yMm). */
export function drawQrVector(
  doc: JsPDFInstance,
  url: string,
  xMm: number,
  yMm: number,
  sizeMm: number,
): void {
  const matrix = getQrModuleMatrix(url, "M");
  const totalModules = matrix.size + QUIET_ZONE_MODULES * 2;
  const moduleSizeMm = sizeMm / totalModules;

  doc.setFillColor(255, 255, 255);
  doc.rect(xMm, yMm, sizeMm, sizeMm, "F");
  doc.setFillColor(0, 0, 0);
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (!matrix.isDark(row, col)) continue;
      doc.rect(
        xMm + (col + QUIET_ZONE_MODULES) * moduleSizeMm,
        yMm + (row + QUIET_ZONE_MODULES) * moduleSizeMm,
        moduleSizeMm + MODULE_OVERLAP_MM,
        moduleSizeMm + MODULE_OVERLAP_MM,
        "F",
      );
    }
  }
}
