/**
 * Draws a QR code straight into a jsPDF document as vector rectangles,
 * instead of embedding it as a raster image — see getQrModuleMatrix in
 * productQr.ts for why that distinction is what actually makes a printed QR
 * scannable on a thermal print bridge.
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

export interface QrLogo {
  dataUrl: string;
  format: "PNG" | "JPEG";
}

/** Draws a `sizeMm × sizeMm` QR (quiet zone included in that size) at (xMm, yMm), with an optional centered logo — mirrors drawLogoOnCanvas's white-box treatment in productQr.ts, sized to stay inside the "H" error-correction budget. */
export function drawQrVector(
  doc: JsPDFInstance,
  url: string,
  xMm: number,
  yMm: number,
  sizeMm: number,
  logo?: QrLogo | null,
): void {
  const matrix = getQrModuleMatrix(url);
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

  if (!logo) return;
  const logoSizeMm = sizeMm * 0.22;
  const padMm = sizeMm * 0.015;
  const boxSizeMm = logoSizeMm + padMm * 2;
  const boxX = xMm + (sizeMm - boxSizeMm) / 2;
  const boxY = yMm + (sizeMm - boxSizeMm) / 2;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(boxX, boxY, boxSizeMm, boxSizeMm, 0.6, 0.6, "F");
  doc.addImage(
    logo.dataUrl,
    logo.format,
    xMm + (sizeMm - logoSizeMm) / 2,
    yMm + (sizeMm - logoSizeMm) / 2,
    logoSizeMm,
    logoSizeMm,
  );
}
