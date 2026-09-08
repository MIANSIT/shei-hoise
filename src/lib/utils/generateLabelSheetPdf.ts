/**
 * A standard A4 page of QR labels arranged in a grid — for a regular office
 * printer (not a thermal label roll, see generateLabelPdf.ts for that one),
 * so a handful of products' QR codes come out on one sheet to cut apart,
 * instead of one 58mm strip per product.
 *
 * The store logo/name are drawn inside *every* cell, not once at the top of
 * the page — once the sheet is cut into individual labels, a page-level
 * header would only ever survive on whichever label happened to be in the
 * top row, leaving every other cut-out label unbranded.
 */
import { JsPDFInstance, loadImageBase64, registerBengaliFont, setTextFont } from "./pdfText";
import { drawQrVector, minQrSizeMm } from "./pdfQr";

export interface LabelSheetItem {
  qrUrl: string;
  productName: string;
}

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_MM = 12;
const COLS = 3;
const CELL_GAP_MM = 8;
const CELL_W_MM = (PAGE_W_MM - 2 * MARGIN_MM - (COLS - 1) * CELL_GAP_MM) / COLS;

// A light rounded border around each cell, inset from the grid gap — the
// visible "cut here" guide once the sheet is cut into individual labels.
// Kept comfortably smaller than half of CELL_GAP_MM so adjacent borders
// never touch.
const CELL_BORDER_PADDING_MM = 3;
const CELL_BORDER_RADIUS_MM = 2.5;

const LOGO_SIZE_MM = 7;
const QR_SIZE_MM = 36;
const MIN_MODULE_SIZE_MM = 0.5; // plenty for a laser/inkjet page, unlike a lossy thermal bridge
// Fixed per-cell budget so every row lines up regardless of whether this
// store has a logo, or how long an individual product's name is: logo +
// store name, then the QR, then up to two lines of product name.
const HEADER_MM = (hasLogo: boolean) => (hasLogo ? LOGO_SIZE_MM + 1.2 : 0) + 4.5;
const NAME_AREA_MM = 8.5;
const cellHeightMm = (hasLogo: boolean) => HEADER_MM(hasLogo) + QR_SIZE_MM + NAME_AREA_MM;

const ROWS_PER_PAGE = (hasLogo: boolean) =>
  Math.max(
    1,
    Math.floor((PAGE_H_MM - 2 * MARGIN_MM + CELL_GAP_MM) / (cellHeightMm(hasLogo) + CELL_GAP_MM)),
  );

function drawCell(
  doc: JsPDFInstance,
  item: LabelSheetItem,
  storeName: string,
  logo: { dataUrl: string; format: "PNG" | "JPEG" } | null,
  x: number,
  y: number,
  cellHMm: number,
  bengaliLoaded: boolean,
): void {
  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.25);
  doc.roundedRect(
    x - CELL_BORDER_PADDING_MM,
    y - CELL_BORDER_PADDING_MM,
    CELL_W_MM + CELL_BORDER_PADDING_MM * 2,
    cellHMm + CELL_BORDER_PADDING_MM * 2,
    CELL_BORDER_RADIUS_MM,
    CELL_BORDER_RADIUS_MM,
    "S",
  );

  let cursorY = y;

  if (logo) {
    doc.addImage(logo.dataUrl, logo.format, x + (CELL_W_MM - LOGO_SIZE_MM) / 2, cursorY, LOGO_SIZE_MM, LOGO_SIZE_MM);
    cursorY += LOGO_SIZE_MM + 1.2;
  }

  doc.setFontSize(6.5);
  doc.setTextColor(85, 85, 85);
  setTextFont(doc, storeName, bengaliLoaded, false);
  doc.text(storeName, x + CELL_W_MM / 2, cursorY + 3, { align: "center" });
  cursorY += 4.5;

  const qrSizeMm = Math.min(QR_SIZE_MM, Math.max(30, minQrSizeMm(item.qrUrl, MIN_MODULE_SIZE_MM)));
  const qrX = x + (CELL_W_MM - qrSizeMm) / 2;
  drawQrVector(doc, item.qrUrl, qrX, cursorY, qrSizeMm);
  cursorY += qrSizeMm + 3;

  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  setTextFont(doc, item.productName, bengaliLoaded, true);
  const lines: string[] = doc.splitTextToSize(item.productName, CELL_W_MM);
  lines.slice(0, 2).forEach((line: string, i: number) => {
    doc.text(line, x + CELL_W_MM / 2, cursorY + i * 3, { align: "center" });
  });
}

export async function generateLabelSheetPdf(
  storeName: string,
  logoUrl: string | null | undefined,
  items: LabelSheetItem[],
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");

  const logo = logoUrl ? await loadImageBase64(logoUrl) : null;
  const hasLogo = !!logo;
  const cellHMm = cellHeightMm(hasLogo);
  const rowsPerPage = ROWS_PER_PAGE(hasLogo);
  const itemsPerPage = COLS * rowsPerPage;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const bengaliLoaded = await registerBengaliFont(doc);

  for (let i = 0; i < items.length; i++) {
    const posOnPage = i % itemsPerPage;
    if (posOnPage === 0 && i > 0) doc.addPage();

    const row = Math.floor(posOnPage / COLS);
    const col = posOnPage % COLS;
    const x = MARGIN_MM + col * (CELL_W_MM + CELL_GAP_MM);
    const y = MARGIN_MM + row * (cellHMm + CELL_GAP_MM);
    drawCell(doc, items[i], storeName, logo, x, y, cellHMm, bengaliLoaded);
  }

  return doc.output("blob");
}
