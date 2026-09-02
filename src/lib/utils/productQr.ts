import QRCode from "qrcode";
import { printHtmlDocument } from "./printWindow";

/**
 * The public, customer-facing product page URL — the same route the
 * storefront already serves at src/app/[store_slug]/product/[slug]/page.tsx.
 * A QR encoding this URL needs no dedicated "customer view" of its own:
 * scanning it just opens the real product page.
 */
export function getProductPublicUrl(
  storeSlug: string,
  productSlug: string,
  origin?: string,
): string {
  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/${storeSlug}/product/${productSlug}`;
}

/** The store's own storefront homepage — used for a "shop with us online" QR on a printed receipt, as opposed to a single product's page. */
export function getStorePublicUrl(storeSlug: string, origin?: string): string {
  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/${storeSlug}`;
}

function drawLogoOnCanvas(
  canvas: HTMLCanvasElement,
  logoUrl: string,
): Promise<void> {
  return new Promise((resolve) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve();
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = canvas.width * 0.22;
      const x = (canvas.width - size) / 2;
      const y = (canvas.height - size) / 2;
      const pad = 6;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      const roundRect = (
        ctx as CanvasRenderingContext2D & {
          roundRect?: (
            x: number,
            y: number,
            w: number,
            h: number,
            r: number,
          ) => void;
        }
      ).roundRect;
      if (typeof roundRect === "function") {
        roundRect.call(ctx, x - pad, y - pad, size + pad * 2, size + pad * 2, 8);
      } else {
        ctx.rect(x - pad, y - pad, size + pad * 2, size + pad * 2);
      }
      ctx.fill();
      ctx.drawImage(img, x, y, size, size);
      resolve();
    };
    // A logo that fails to load (CORS, deleted asset) shouldn't block the
    // QR itself — just render without branding.
    img.onerror = () => resolve();
    img.src = logoUrl;
  });
}

/**
 * Renders into a live <canvas> (e.g. inside a modal). errorCorrectionLevel
 * "H" leaves enough redundancy that a centered logo doesn't break scanning.
 */
export async function renderProductQrToCanvas(
  canvas: HTMLCanvasElement,
  url: string,
  logoUrl?: string | null,
): Promise<void> {
  await QRCode.toCanvas(canvas, url, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 260,
  });
  if (logoUrl) await drawLogoOnCanvas(canvas, logoUrl);
}

/**
 * Same as above but off-screen, resolving a PNG data URL — used when
 * printing/downloading. A logo served without CORS headers taints the
 * canvas (it still *draws* fine, but pixel extraction then throws), so on
 * failure this retries once without the logo rather than failing silently.
 */
export async function renderProductQrDataUrl(
  url: string,
  logoUrl?: string | null,
): Promise<string> {
  const canvas = document.createElement("canvas");
  await renderProductQrToCanvas(canvas, url, logoUrl);
  try {
    return canvas.toDataURL("image/png");
  } catch {
    const plain = document.createElement("canvas");
    await renderProductQrToCanvas(plain, url, null);
    return plain.toDataURL("image/png");
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** Same tainted-canvas fallback as {@link renderProductQrDataUrl}, but as a Blob (for downloads). */
export async function renderProductQrBlob(
  url: string,
  logoUrl?: string | null,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  await renderProductQrToCanvas(canvas, url, logoUrl);
  let blob = await canvasToBlob(canvas);
  if (!blob) {
    const plain = document.createElement("canvas");
    await renderProductQrToCanvas(plain, url, null);
    blob = await canvasToBlob(plain);
  }
  if (!blob) throw new Error("Could not generate the QR image.");
  return blob;
}

/**
 * Prints a QR label sheet in its own document (not this page's print
 * styles), so it never fights whatever @page rule the calling page already
 * uses for something else (e.g. a receipt).
 */
export function openLabelPrintWindow(
  title: string,
  bodyHtml: string,
  pageCss: string,
): void {
  const styles =
    "body{font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;margin:0;padding:16px;background:#fff;color:#000;}" +
    pageCss;
  printHtmlDocument(title, bodyHtml, styles);
}

/** Pulls the product slug back out of a scanned .../product/<slug> URL. */
export function extractProductSlugFromScannedText(text: string): string | null {
  try {
    const url = new URL(text);
    const match = url.pathname.match(/\/product\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}
