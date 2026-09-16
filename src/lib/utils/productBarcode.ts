/**
 * On-screen/exported rendering for a product's CODE128 barcode — the same
 * split as productQr.ts: a live <canvas> render for the modal, plus PNG
 * data-URL/Blob variants for download. The PDF print path (pdfBarcode.ts)
 * draws the same encoded pattern as vector rectangles instead, for the same
 * "don't let a thermal print bridge dither this into unscannable static"
 * reason documented there.
 */
import { encodeCode128B, isBarcode128Encodable } from "./barcode128";

// Human-readable text under the bars needs its own reserved band — sized in
// canvas px here (the PDF path uses its own mm-based version, see
// generateBarcodeLabelPdf.ts).
const TEXT_BAND_PX = 36;
const QUIET_ZONE_MODULES = 10;

export { isBarcode128Encodable };

/** Renders into a live <canvas> (e.g. inside a modal). `moduleWidthPx` sizes the narrowest bar; canvas dimensions are set from it, not assumed. */
export function renderBarcodeToCanvas(
  canvas: HTMLCanvasElement,
  value: string,
  moduleWidthPx = 2.5,
): void {
  const pattern = encodeCode128B(value);
  const quietPx = QUIET_ZONE_MODULES * moduleWidthPx;
  const barsWidthPx = pattern.modules * moduleWidthPx;
  const width = Math.ceil(barsWidthPx + quietPx * 2);
  const barsHeightPx = 90;
  const height = barsHeightPx + TEXT_BAND_PX;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#000";
  for (let i = 0; i < pattern.modules; i++) {
    if (!pattern.isDark(i)) continue;
    ctx.fillRect(quietPx + i * moduleWidthPx, 0, moduleWidthPx + 0.5, barsHeightPx);
  }

  ctx.font = "600 15px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(value, width / 2, barsHeightPx + TEXT_BAND_PX / 2, width - 8);
}

/** Same as {@link renderBarcodeToCanvas} but off-screen, resolving a PNG data URL — used for download. */
export function renderBarcodeDataUrl(value: string, moduleWidthPx?: number): string {
  const canvas = document.createElement("canvas");
  renderBarcodeToCanvas(canvas, value, moduleWidthPx);
  return canvas.toDataURL("image/png");
}

/** Same as above but as a Blob. */
export function renderBarcodeBlob(value: string, moduleWidthPx?: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  renderBarcodeToCanvas(canvas, value, moduleWidthPx);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not generate the barcode image."));
    }, "image/png");
  });
}
