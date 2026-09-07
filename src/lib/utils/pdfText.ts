/**
 * Shared jsPDF text/image helpers used by every thermal-print PDF this app
 * generates (POS receipts, product QR labels). Pulled out of
 * generateReceiptPdf.ts so a second PDF generator doesn't have to duplicate
 * the Bengali font loading (a real network fetch, cached module-wide) or the
 * tainted-logo-image handling.
 */

export type JsPDFInstance = InstanceType<typeof import("jspdf").jsPDF>;

// ── Bengali font (browser-side) ──────────────────────────────────────────
// The ৳ symbol (and any Bengali store/product name) needs this embedded,
// since jsPDF's built-in fonts have no glyph for it — a bare
// `pdf.text("৳80.00", ...)` would otherwise render with the glyph
// missing/blank.
const BENGALI_FONT_URL = "/fonts/NotoSansBengali-Regular.ttf";
let bengaliFontBase64Cache: string | null | undefined;

async function loadBengaliFontBase64(): Promise<string | null> {
  if (bengaliFontBase64Cache !== undefined) return bengaliFontBase64Cache;
  try {
    const res = await fetch(BENGALI_FONT_URL);
    if (!res.ok) {
      bengaliFontBase64Cache = null;
      return null;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    bengaliFontBase64Cache = btoa(binary);
  } catch {
    bengaliFontBase64Cache = null;
  }
  return bengaliFontBase64Cache;
}

export function hasBengaliChar(text: string): boolean {
  return /[ঀ-৿]/.test(text);
}

/** Registers the Bengali font on this jsPDF instance (font registration is per-instance). Returns whether it's available to use. */
export async function registerBengaliFont(pdf: JsPDFInstance): Promise<boolean> {
  const base64 = await loadBengaliFontBase64();
  if (!base64) return false;
  try {
    pdf.addFileToVFS("NotoSansBengali-Regular.ttf", base64);
    pdf.addFont("NotoSansBengali-Regular.ttf", "NotoSansBengali", "normal");
    return !!pdf.getFontList()["NotoSansBengali"];
  } catch {
    return false;
  }
}

/** Sets the Bengali font if `text` needs it, otherwise falls back to Courier. Always restore with `pdf.setFont("courier", style)` after drawing. */
export function setTextFont(
  pdf: JsPDFInstance,
  text: string,
  bengaliLoaded: boolean,
  bold: boolean,
): void {
  if (bengaliLoaded && hasBengaliChar(text)) {
    pdf.setFont("NotoSansBengali", "normal");
  } else {
    pdf.setFont("courier", bold ? "bold" : "normal");
  }
}

/**
 * Fetches an image URL and resolves it as a base64 data URL for
 * `doc.addImage` — jsPDF can't load a remote URL directly. Best-effort: some
 * store logos aren't served with CORS headers permissive enough for this, so
 * failures resolve to null rather than blocking the PDF.
 */
export function loadImageBase64(
  url: string,
): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> {
  return fetch(url)
    .then((res) => (res.ok ? res.blob() : null))
    .then(
      (blob) =>
        blob &&
        new Promise<{ dataUrl: string; format: "PNG" | "JPEG" }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () =>
            resolve({
              dataUrl: reader.result as string,
              format: blob.type.includes("png") ? "PNG" : "JPEG",
            });
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }),
    )
    .catch(() => null);
}
