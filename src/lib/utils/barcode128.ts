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
const START_C = 105;
const CODE_B = 100;
const CODE_C = 99;
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
 * Encodes `value` as CODE128, starting in Subset B and switching to Subset C
 * for runs of digits — C packs two digits into one 11-module symbol, so a
 * numeric SKU (or the numeric part of one) prints about half as wide. That
 * matters on a 50mm sticker, where every extra module makes each bar thinner.
 * Throws if it contains a character outside printable ASCII (32–126) — call
 * {@link isBarcode128Encodable} first wherever a SKU might legitimately fail
 * this and needs a friendly message instead of a thrown error.
 */
export function encodeCode128B(value: string): Barcode128Pattern {
  if (!isBarcode128Encodable(value)) {
    throw new Error("Barcode text must be plain ASCII (letters, digits, common punctuation).");
  }

  // A digit run is worth switching to Subset C for at 4+ digits at the very
  // start, or 6+ digits mid-value (the switch symbol itself costs one symbol).
  const digitRunAt = (from: number): number => {
    let n = 0;
    while (from + n < value.length && value[from + n] >= "0" && value[from + n] <= "9") n++;
    return n;
  };

  const codes: number[] = [];
  let inC = false;
  let i = 0;
  while (i < value.length) {
    const run = digitRunAt(i);
    if (!inC && run >= (i === 0 ? 4 : 6)) {
      // Odd-length run: leave one digit to Subset B so the rest pairs up evenly.
      if (run % 2 === 1) {
        if (i === 0) codes.push(START_B);
        codes.push(value.charCodeAt(i) - 32);
        i++;
        codes.push(CODE_C);
      } else {
        codes.push(i === 0 ? START_C : CODE_C);
      }
      inC = true;
    } else if (i === 0) {
      codes.push(START_B);
    }

    if (inC) {
      if (digitRunAt(i) >= 2) {
        codes.push(Number(value.slice(i, i + 2)));
        i += 2;
        continue;
      }
      codes.push(CODE_B);
      inC = false;
    }
    codes.push(value.charCodeAt(i) - 32);
    i++;
  }

  let checksum = codes[0];
  for (let k = 1; k < codes.length; k++) checksum += codes[k] * k;
  checksum %= MODULO;

  const bits = [...codes, checksum, STOP].map(moduleString).join("");

  return {
    modules: bits.length,
    isDark: (idx: number) => bits[idx] === "1",
  };
}
