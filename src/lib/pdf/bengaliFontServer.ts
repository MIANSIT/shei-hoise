import fs from "fs";
import path from "path";
import * as fontkit from "fontkit";
import type { Font } from "fontkit";
import type { BengaliPdfFont } from "./bengaliPdfText";

let cached: BengaliPdfFont | null | undefined;

/**
 * Noto Sans Bengali for server-side PDFs (invoice routes), opened with
 * fontkit for shaping — see enableBengaliText(). Null if the font file is
 * missing; PDFs then fall back to jsPDF's own text drawing.
 */
export function loadBengaliFontServer(): BengaliPdfFont | null {
  if (cached !== undefined) return cached;
  try {
    const file = path.join(process.cwd(), "public", "fonts", "NotoSansBengali-Regular.ttf");
    if (!fs.existsSync(file)) {
      cached = null;
    } else {
      const bytes = fs.readFileSync(file);
      cached = { shaper: fontkit.create(bytes) as Font, outlines: fontkit.create(bytes) as Font };
    }
  } catch (err) {
    console.error("Could not load the Bangla PDF font:", err);
    cached = null;
  }
  return cached;
}
