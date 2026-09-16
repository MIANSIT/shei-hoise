/**
 * CODE128 (subset B) barcode encoder — produces the raw module pattern as a
 * bit string (one character per module: "1" = black bar, "0" = white space),
 * the same representation style as the QR module matrix in productQr.ts, so
 * the print path can draw it as vector rectangles instead of a raster image
 * (see pdfBarcode.ts, and getQrModuleMatrix's doc comment on why a raster
 * code gets speckled by a thermal print bridge's photo-dithering step).
 *
 * Subset B covers printable ASCII 32–126 — every character a SKU is likely
 * to contain (digits, letters, common punctuation). The BARS pattern table
 * is the standard CODE128 symbol set (ISO/IEC 15417) — verified against the
 * JsBarcode library's own constants rather than transcribed from memory,
 * since a wrong bar pattern here means a printed sticker that silently
 * doesn't scan at the register.
 */

const START_B = 104;
const STOP = 106;
const MODULO = 103;

// Index 0–95: data symbols for ASCII 32–127 (value = charCode - 32). 96–102:
// special/shift codes, unused by plain Subset B text. 103–105: START A/B/C.
// 106: STOP — 13 modules wide; every other entry is 11.
const BARS: number[] = [
  11011001100, 11001101100, 11001100110, 10010011000, 10010001100,
  10001001100, 10011001000, 10011000100, 10001100100, 11001001000,
  11001000100, 11000100100, 10110011100, 10011011100, 10011001110,
  10111001100, 10011101100, 10011100110, 11001110010, 11001011100,
  11001001110, 11011100100, 11001110100, 11101101110, 11101001100,
  11100101100, 11100100110, 11101100100, 11100110100, 11100110010,
  11011011000, 11011000110, 11000110110, 10100011000, 10001011000,
  10001000110, 10110001000, 10001101000, 10001100010, 11010001000,
  11000101000, 11000100010, 10110111000, 10110001110, 10001101110,
  10111011000, 10111000110, 10001110110, 11101110110, 11010001110,
  11000101110, 11011101000, 11011100010, 11011101110, 11101011000,
  11101000110, 11100010110, 11101101000, 11101100010, 11100011010,
  11101111010, 11001000010, 11110001010, 10100110000, 10100001100,
  10010110000, 10010000110, 10000101100, 10000100110, 10110010000,
  10110000100, 10011010000, 10011000010, 10000110100, 10000110010,
  11000010010, 11001010000, 11110111010, 11000010100, 10001111010,
  10100111100, 10010111100, 10010011110, 10111100100, 10011110100,
  10011110010, 11110100100, 11110010100, 11110010010, 11011011110,
  11011110110, 11110110110, 10101111000, 10100011110, 10001011110,
  10111101000, 10111100010, 11110101000, 11110100010, 10111011110,
  10111101110, 11101011110, 11110101110, 11010000100, 11010010000,
  11010011100, 1100011101011,
];

function moduleString(code: number): string {
  return String(BARS[code]);
}

export interface Barcode128Pattern {
  /** Total width in modules — the narrowest bar/space unit. */
  modules: number;
  /** True where module `i` is a black bar, false where it's a white space. */
  isDark(i: number): boolean;
}

/** True if `value` can be encoded as CODE128 Subset B (plain printable ASCII). */
export function isBarcode128Encodable(value: string): boolean {
  return value.length > 0 && /^[\x20-\x7E]+$/.test(value);
}

/**
 * Encodes `value` as CODE128 Subset B. Throws if it contains a character
 * outside printable ASCII (32–126) — call {@link isBarcode128Encodable}
 * first wherever a SKU might legitimately fail this and needs a friendly
 * message instead of a thrown error.
 */
export function encodeCode128B(value: string): Barcode128Pattern {
  if (!isBarcode128Encodable(value)) {
    throw new Error("Barcode text must be plain ASCII (letters, digits, common punctuation).");
  }

  const values = value.split("").map((ch) => ch.charCodeAt(0) - 32);
  let checksum = START_B;
  values.forEach((v, i) => {
    checksum += v * (i + 1);
  });
  checksum %= MODULO;

  const codes = [START_B, ...values, checksum, STOP];
  const bits = codes.map(moduleString).join("");

  return {
    modules: bits.length,
    isDark: (i: number) => bits[i] === "1",
  };
}
