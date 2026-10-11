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

  // Each distinct Bangla glyph is drawn into the PDF once, as a reusable
  // form object, and every later use is a one-line "place it here, at this
  // size". Drawing the outline again for every letter of every invoice made a
  // bulk PDF with Bangla addresses tens of MB (and ran the server out of
  // memory); now the file grows by a few KB per glyph, once.
  //
  // A glyph form is drawn at 1 unit per em, with its origin at (FORM_ORIGIN_X,
  // FORM_ORIGIN_Y) inside a FORM_SIZE x FORM_SIZE box that leaves room for
  // marks above and below the line.
  const FORM_SIZE = 4;
  const FORM_ORIGIN_X = 1;
  const FORM_ORIGIN_Y = 2.5;
  const glyphForms = new Set<number>();

  const defineGlyphForm = (glyphId: number, commands: ReturnType<typeof outlineOf>["path"]["commands"]) => {
    const key = `bn-glyph-${glyphId}`;
    if (glyphForms.has(glyphId)) return key;
    glyphForms.add(glyphId);

    const emScale = 1 / unitsPerEm;
    const X = (fx: number) => FORM_ORIGIN_X + fx * emScale;
    const Y = (fy: number) => FORM_ORIGIN_Y - fy * emScale;
    // The box is in points (jsPDF's form-object size), while the drawing
    // inside it is in user units — hence the scale factor here only.
    const box = FORM_SIZE * scaleFactor();
    pdf.beginFormObject(0, 0, box, box, pdf.unitMatrix);
    let cx = 0;
    let cy = 0;
    for (const { command, args } of commands) {
      if (command === "moveTo") {
        pdf.moveTo(X(args[0]), Y(args[1]));
        [cx, cy] = [args[0], args[1]];
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
    pdf.fill();
    pdf.endFormObject(key);
    return key;
  };

  const drawGlyph = (glyph: Glyph, originX: number, baselineY: number, scale: number) => {
    const commands = outlineOf(glyph).path.commands;
    if (commands.length === 0) return;
    const key = defineGlyphForm(glyph.id, commands);

    // scale = user units per font unit; the form is 1 unit per em.
    const size = scale * unitsPerEm; // the em, in user units
    const k = scaleFactor();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const e = (originX - size * FORM_ORIGIN_X) * k;
    const f = (pageHeight - baselineY - size * (FORM_SIZE - FORM_ORIGIN_Y)) * k;
    pdf.doFormObject(key, pdf.Matrix(size, 0, 0, size, e, f));
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
