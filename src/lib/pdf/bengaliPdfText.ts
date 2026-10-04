import type { Font, Glyph } from "fontkit";

/**
 * The Bangla font, opened twice from the same file. fontkit reads glyph
 * outlines and shaping tables through one shared reader, and reading some
 * outlines (র, ড …) corrupts later shaping on that object — dotted circles
 * appear (◌া). Shaping on one copy and drawing outlines from the other
 * avoids it.
 */
export interface BengaliPdfFont {
  shaper: Font;
  outlines: Font;
}
import type { jsPDF } from "jspdf";

/**
 * Correct Bangla in jsPDF documents.
 *
 * jsPDF lays text out one character after another, so Bangla comes out
 * wrong: a vowel sign like ি lands after its consonant ("জিএম" → "জএিম")
 * and joined letters (স্ট, ন্ড) fall apart. Fixing that needs OpenType
 * shaping, which jsPDF doesn't do.
 *
 * enableBengaliText() patches one jsPDF document so every piece of text
 * with Bangla in it is shaped by fontkit (Noto Sans Bengali) and drawn as
 * vector outlines, while English, digits and symbols keep using the
 * document's normal font. Mixed text ("নমিতা রানী 01812158438") is split
 * into runs, each drawn in the right font. Measuring and wrapping
 * (getTextWidth, splitTextToSize) are patched too, so layouts and
 * autoTable columns line up. Works in the browser and on the server.
 */

const BENGALI = /[ঀ-৿]/;
// A run of Bangla: Bangla letters/marks plus joiners, and spaces between them.
const RUN = /([ঀ-৿‌‍]+(?:[  ]+[ঀ-৿‌‍]+)*)/;
const BENGALI_FONT_NAME = "NotoSansBengali";

/**
 * ড় ঢ় য় are often typed as a letter + nukta (ড + ়). Unicode never
 * composes these (NFC leaves them apart), and the shaper then shows a
 * dotted circle — so join them into the single letter first.
 */
function normalizeBengali(text: string): string {
  return text
    .replace(/ড়/g, "ড়")
    .replace(/ঢ়/g, "ঢ়")
    .replace(/য়/g, "য়");
}

export function hasBengaliText(text: string): boolean {
  return BENGALI.test(text);
}

type TextOptions = { align?: "left" | "center" | "right" | "justify"; maxWidth?: number; [key: string]: unknown };

interface Segment {
  text: string;
  bengali: boolean;
}

function segments(text: string): Segment[] {
  return text
    .split(RUN)
    .filter((part) => part !== "")
    .map((part) => ({ text: part, bengali: BENGALI.test(part) }));
}

const patched = new WeakSet<object>();

/**
 * Makes this document draw Bangla correctly. Safe to call more than once.
 * @param pdf - the jsPDF document
 * @param fonts - Noto Sans Bengali, opened twice with fontkit (null = leave as is)
 */
export function enableBengaliText(pdf: jsPDF, fonts: BengaliPdfFont | null): void {
  if (!fonts || patched.has(pdf)) return;
  patched.add(pdf);
  const font = fonts.shaper;
  const outlineOf = (glyph: Glyph) => fonts.outlines.getGlyph(glyph.id);

  const originalText = pdf.text.bind(pdf) as (...args: unknown[]) => jsPDF;
  const originalWidth = pdf.getTextWidth.bind(pdf);
  const originalUnitWidth = pdf.getStringUnitWidth.bind(pdf);
  const originalSplit = pdf.splitTextToSize.bind(pdf);

  const unitsPerEm = font.unitsPerEm;
  const scaleFactor = () => pdf.internal.scaleFactor; // points per user unit
  const fontSizeInUnits = () => pdf.getFontSize() / scaleFactor();

  // English runs never use the Bangla font (it has no Latin letters — that's
  // what made English product names print blank after a Bangla address).
  const latinFont = () => {
    const current = pdf.getFont();
    return current.fontName === BENGALI_FONT_NAME
      ? { name: "helvetica", style: "normal" }
      : { name: current.fontName, style: current.fontStyle };
  };

  const shapedWidth = (text: string) => (font.layout(normalizeBengali(text)).advanceWidth / unitsPerEm) * fontSizeInUnits();

  const measure = (text: string): number => {
    if (!hasBengaliText(text)) {
      const f = latinFont();
      const before = pdf.getFont();
      if (before.fontName === BENGALI_FONT_NAME) pdf.setFont(f.name, f.style);
      const w = originalWidth(text);
      if (before.fontName === BENGALI_FONT_NAME) pdf.setFont(before.fontName, before.fontStyle);
      return w;
    }
    let total = 0;
    const f = latinFont();
    const before = pdf.getFont();
    for (const seg of segments(text)) {
      if (seg.bengali) {
        total += shapedWidth(seg.text);
      } else {
        pdf.setFont(f.name, f.style);
        total += originalWidth(seg.text);
      }
    }
    pdf.setFont(before.fontName, before.fontStyle);
    return total;
  };

  const drawGlyph = (glyph: Glyph, originX: number, baselineY: number, scale: number) => {
    const commands = outlineOf(glyph).path.commands;
    if (commands.length === 0) return;
    const X = (fx: number) => originX + fx * scale;
    const Y = (fy: number) => baselineY - fy * scale;
    let cx = 0;
    let cy = 0;
    let open = false;
    for (const { command, args } of commands) {
      if (command === "moveTo") {
        pdf.moveTo(X(args[0]), Y(args[1]));
        [cx, cy] = [args[0], args[1]];
        open = true;
      } else if (command === "lineTo") {
        pdf.lineTo(X(args[0]), Y(args[1]));
        [cx, cy] = [args[0], args[1]];
      } else if (command === "quadraticCurveTo") {
        // Quadratic → cubic Bézier.
        const [qx, qy, x, y] = args;
        const c1x = cx + (2 / 3) * (qx - cx);
        const c1y = cy + (2 / 3) * (qy - cy);
        const c2x = x + (2 / 3) * (qx - x);
        const c2y = y + (2 / 3) * (qy - y);
        pdf.curveTo(X(c1x), Y(c1y), X(c2x), Y(c2y), X(x), Y(y));
        [cx, cy] = [x, y];
      } else if (command === "bezierCurveTo") {
        const [c1x, c1y, c2x, c2y, x, y] = args;
        pdf.curveTo(X(c1x), Y(c1y), X(c2x), Y(c2y), X(x), Y(y));
        [cx, cy] = [x, y];
      } else if (command === "closePath") {
        pdf.close();
      }
    }
    if (open) pdf.fill();
  };

  const drawShaped = (text: string, x: number, baselineY: number): number => {
    const run = font.layout(normalizeBengali(text));
    const size = fontSizeInUnits();
    const scale = size / unitsPerEm;
    const fillBefore = pdf.getFillColor();
    pdf.setFillColor(pdf.getTextColor());
    let penX = x;
    run.glyphs.forEach((glyph, i) => {
      const pos = run.positions[i];
      drawGlyph(glyph, penX + pos.xOffset * scale, baselineY - pos.yOffset * scale, scale);
      penX += pos.xAdvance * scale;
    });
    pdf.setFillColor(fillBefore);
    return penX - x;
  };

  const drawLine = (line: string, x: number, y: number, options?: TextOptions) => {
    const align = options?.align ?? "left";
    const width = measure(line);
    let startX = x;
    if (align === "right") startX = x - width;
    else if (align === "center") startX = x - width / 2;

    const f = latinFont();
    const before = pdf.getFont();
    let penX = startX;
    for (const seg of segments(line)) {
      if (seg.bengali) {
        penX += drawShaped(seg.text, penX, y);
      } else {
        pdf.setFont(f.name, f.style);
        originalText(seg.text, penX, y);
        penX += originalWidth(seg.text);
      }
    }
    pdf.setFont(before.fontName, before.fontStyle);
  };

  pdf.text = ((text: string | string[], x: number, y: number, options?: TextOptions, ...rest: unknown[]) => {
    const lines = Array.isArray(text) ? text : String(text ?? "").split("\n");
    if (!lines.some((line) => hasBengaliText(String(line)))) {
      // No Bangla: plain jsPDF, but never in the Bangla font.
      const current = pdf.getFont();
      if (current.fontName === BENGALI_FONT_NAME) {
        const f = latinFont();
        pdf.setFont(f.name, f.style);
        originalText(text, x, y, options, ...rest);
        pdf.setFont(current.fontName, current.fontStyle);
        return pdf;
      }
      return originalText(text, x, y, options, ...rest);
    }
    const wrapped =
      options?.maxWidth && options.maxWidth > 0
        ? lines.flatMap((line) => wrapLine(String(line), options.maxWidth as number))
        : lines.map(String);
    const lineHeight = (pdf.getFontSize() * pdf.getLineHeightFactor()) / scaleFactor();
    wrapped.forEach((line, i) => drawLine(line, x, y + i * lineHeight, options));
    return pdf;
  }) as typeof pdf.text;

  pdf.getTextWidth = (text: string) => measure(String(text ?? ""));

  pdf.getStringUnitWidth = ((text: string, options?: unknown) => {
    const str = String(text ?? "");
    if (!hasBengaliText(str)) return originalUnitWidth(str, options);
    return (measure(str) * scaleFactor()) / pdf.getFontSize();
  }) as typeof pdf.getStringUnitWidth;

  const wrapLine = (line: string, maxWidth: number): string[] => {
    if (measure(line) <= maxWidth) return [line];
    const words = line.split(/(\s+)/);
    const out: string[] = [];
    let current = "";
    for (const word of words) {
      const next = current + word;
      if (current.trim() !== "" && measure(next.trimEnd()) > maxWidth) {
        out.push(current.trimEnd());
        current = word.trimStart();
      } else {
        current = next;
      }
    }
    if (current.trim() !== "") out.push(current.trimEnd());
    return out.length > 0 ? out : [line];
  };

  pdf.splitTextToSize = ((text: string | string[], maxlen: number, options?: unknown) => {
    const input = Array.isArray(text) ? text.join("\n") : String(text ?? "");
    if (!hasBengaliText(input)) return originalSplit(text as string, maxlen, options);
    return input.split("\n").flatMap((line) => wrapLine(line, maxlen));
  }) as typeof pdf.splitTextToSize;
}
