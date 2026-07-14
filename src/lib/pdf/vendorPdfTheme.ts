import type { jsPDF } from "jspdf";

// Shared visual language for every vendor-facing PDF (invoice, statement) so
// they read as one consistent document family instead of independently
// drifting layouts. Colors mirror the app's own brand gradient
// (bg-linear-to-br from-indigo-400 to-purple-600 / #667eea → #764ba2) used
// on every vendor page's primary buttons and icons.
export const PDF_COLORS = {
  gradientStart: [102, 126, 234] as [number, number, number], // #667eea
  gradientEnd: [118, 75, 162] as [number, number, number], // #764ba2
  brand: [79, 70, 229] as [number, number, number], // #4f46e5 — solid accent for text/lines
  textMuted: [107, 114, 128] as [number, number, number], // gray-500
  danger: [220, 38, 38] as [number, number, number], // red-600
  success: [5, 150, 105] as [number, number, number], // emerald-600
  panelBg: [248, 250, 252] as [number, number, number], // slate-50
  border: [226, 232, 240] as [number, number, number], // slate-200
};

// jsPDF has no native gradient fill, so a horizontal gradient is faked with
// a run of thin, slightly-overlapping vertical strips interpolating RGB
// between the two stops.
export function drawGradientBand(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  from: [number, number, number] = PDF_COLORS.gradientStart,
  to: [number, number, number] = PDF_COLORS.gradientEnd,
) {
  const steps = 90;
  const stepWidth = width / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = Math.round(from[0] + (to[0] - from[0]) * t);
    const g = Math.round(from[1] + (to[1] - from[1]) * t);
    const b = Math.round(from[2] + (to[2] - from[2]) * t);
    pdf.setFillColor(r, g, b);
    pdf.rect(x + i * stepWidth, y, stepWidth + 0.5, height, "F");
  }
}

// Truncates text with an ellipsis so it never collides with whatever is
// anchored to its right — jsPDF has no auto-fit, and a long store name at a
// fixed left position used to run straight into the right-anchored title on
// the same line with no minimum gap.
export function fitTextWidth(pdf: jsPDF, text: string, maxWidth: number): string {
  if (pdf.getTextWidth(text) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && pdf.getTextWidth(`${truncated}…`) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

interface VendorPdfHeaderOptions {
  storeName: string;
  storeInfoLines: string[];
  title: string;
  metaLines: string[];
  pageWidth: number;
  margin: number;
}

// Draws the shared gradient header band. Store name and title are measured
// against each other first so a minimum 10mm gap is always enforced —
// the store name shrinks-to-fit (ellipsis) rather than overlapping.
// Returns the y position where the rest of the page content should start.
export function drawVendorPdfHeader(pdf: jsPDF, opts: VendorPdfHeaderOptions): number {
  const { storeName, storeInfoLines, title, metaLines, pageWidth, margin } = opts;
  const bandHeight = 26 + storeInfoLines.length * 4;

  drawGradientBand(pdf, 0, 0, pageWidth, bandHeight);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  const upperTitle = title.toUpperCase();
  const titleWidth = pdf.getTextWidth(upperTitle);

  pdf.setFontSize(17);
  const storeNameMaxWidth = pageWidth - margin * 2 - titleWidth - 10;
  const fittedName = fitTextWidth(pdf, storeName, storeNameMaxWidth);

  pdf.setTextColor(255, 255, 255);
  pdf.text(fittedName, margin, margin + 3);

  pdf.setFontSize(13);
  pdf.text(upperTitle, pageWidth - margin - titleWidth, margin + 3);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  storeInfoLines.forEach((line, i) => {
    pdf.text(line, margin, margin + 9 + i * 4);
  });

  let metaY = margin + 9;
  metaLines.forEach((line) => {
    const w = pdf.getTextWidth(line);
    pdf.text(line, pageWidth - margin - w, metaY);
    metaY += 4;
  });

  pdf.setTextColor(0, 0, 0);
  return bandHeight + 10;
}

// A soft rounded panel behind a block of content (e.g. "Bill To" or the
// totals summary) so those sections read as distinct cards rather than
// bare text floating on the page.
export function drawPanel(pdf: jsPDF, x: number, y: number, width: number, height: number) {
  pdf.setFillColor(...PDF_COLORS.panelBg);
  pdf.setDrawColor(...PDF_COLORS.border);
  pdf.roundedRect(x, y, width, height, 2, 2, "FD");
}
