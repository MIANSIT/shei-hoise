import type { Font } from "fontkit";
import type { BengaliPdfFont } from "./bengaliPdfText";

let cached: Promise<BengaliPdfFont | null> | null = null;

/**
 * Noto Sans Bengali for PDFs made in the browser (reports, receipts), opened
 * with fontkit for shaping — see enableBengaliText(). Loaded once per page.
 * Null if it can't be fetched; PDFs then fall back to jsPDF's own drawing.
 */
export function loadBengaliFontBrowser(): Promise<BengaliPdfFont | null> {
  if (!cached) {
    cached = (async () => {
      try {
        const [fontkit, res] = await Promise.all([import("fontkit"), fetch("/fonts/NotoSansBengali-Regular.ttf")]);
        if (!res.ok) return null;
        const bytes = new Uint8Array(await res.arrayBuffer());
        const data = bytes as unknown as Buffer;
        return { shaper: fontkit.create(data) as Font, outlines: fontkit.create(data) as Font };
      } catch (err) {
        console.error("Could not load the Bangla PDF font:", err);
        return null;
      }
    })();
  }
  return cached;
}
