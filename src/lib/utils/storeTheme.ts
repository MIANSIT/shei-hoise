/**
 * Derives a full light+dark CSS-variable set from a store owner's 5-color
 * brand palette. The owner only ever picks ONE set of colors — dark mode is
 * generated automatically (same hue, remapped lightness) so there's no
 * separate dark palette to configure, and every background gets an
 * automatically-contrasted foreground text color. No color-manipulation
 * library is added for this — the app has none installed, and the math
 * needed (hex<->HSL, WCAG relative luminance) is small enough to hand-roll.
 */

export interface BrandPalette {
  primary: string;
  /**
   * Background color of primary buttons on :hover — the owner picks this
   * explicitly rather than it being auto-computed. Optional (not one of
   * PALETTE_KEYS below) so a palette saved before this field existed stays
   * valid: deriveStoreThemeVars simply omits the override when absent, and
   * the CSS in globals.css falls back to an auto-darkened primary.
   */
  hover?: string;
  background: string;
  header: string;
  footer: string;
  card: string;
}

export interface BrandPreset {
  id: string;
  name: string;
  palette: BrandPalette;
}

export interface StoreThemeVars {
  light: Record<string, string>;
  dark: Record<string, string>;
}

const PALETTE_KEYS: (keyof BrandPalette)[] = ["primary", "background", "header", "footer", "card"];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isBrandPalette(value: unknown): value is BrandPalette {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (!PALETTE_KEYS.every((key) => typeof record[key] === "string" && HEX_COLOR.test(record[key] as string))) {
    return false;
  }
  // hover is optional (added after this validator shipped) — only checked when present.
  return record.hover === undefined || (typeof record.hover === "string" && HEX_COLOR.test(record.hover));
}

export const BRAND_PRESETS: BrandPreset[] = [
  {
    id: "warm-gold",
    name: "Warm Gold",
    palette: { primary: "#B5892C", hover: "#8F6C20", background: "#FAF8F5", header: "#FFFFFF", footer: "#171512", card: "#FFFFFF" },
  },
  {
    id: "emerald",
    name: "Emerald",
    palette: { primary: "#1F7A5C", hover: "#175F47", background: "#F6FAF8", header: "#FFFFFF", footer: "#0E2A22", card: "#FFFFFF" },
  },
  {
    id: "midnight",
    name: "Midnight",
    palette: { primary: "#4C6FFF", hover: "#3651CC", background: "#F5F6FB", header: "#FFFFFF", footer: "#0B1020", card: "#FFFFFF" },
  },
  {
    id: "terracotta",
    name: "Terracotta",
    palette: { primary: "#C1552C", hover: "#9C4423", background: "#FDF6F1", header: "#FFFFFF", footer: "#2B1710", card: "#FFFFFF" },
  },
  {
    id: "rose-quartz",
    name: "Rose Quartz",
    palette: { primary: "#C9557B", hover: "#A34362", background: "#FDF5F7", header: "#FFFFFF", footer: "#2A1620", card: "#FFFFFF" },
  },
  {
    id: "slate",
    name: "Slate",
    palette: { primary: "#4B5563", hover: "#374151", background: "#F7F8F9", header: "#FFFFFF", footer: "#111827", card: "#FFFFFF" },
  },
  {
    id: "ocean",
    name: "Ocean",
    palette: { primary: "#0E7490", hover: "#0B5A6E", background: "#F3FAFB", header: "#FFFFFF", footer: "#0B2E36", card: "#FFFFFF" },
  },
  {
    id: "plum",
    name: "Plum",
    palette: { primary: "#6D28D9", hover: "#5B21B6", background: "#F8F6FC", header: "#FFFFFF", footer: "#1E1533", card: "#FFFFFF" },
  },
  {
    id: "forest",
    name: "Forest",
    palette: { primary: "#2F6B3A", hover: "#24522C", background: "#F5FAF6", header: "#FFFFFF", footer: "#102613", card: "#FFFFFF" },
  },
  {
    id: "crimson",
    name: "Crimson",
    palette: { primary: "#B0233A", hover: "#8C1C2E", background: "#FDF5F6", header: "#FFFFFF", footer: "#2B0E13", card: "#FFFFFF" },
  },
  {
    id: "amber",
    name: "Amber",
    palette: { primary: "#D97706", hover: "#B45F04", background: "#FFFAF0", header: "#FFFFFF", footer: "#2B1C08", card: "#FFFFFF" },
  },
  {
    id: "charcoal",
    name: "Charcoal",
    palette: { primary: "#262626", hover: "#171717", background: "#FAFAFA", header: "#FFFFFF", footer: "#111111", card: "#FFFFFF" },
  },
];

// ---- hex <-> HSL helpers ----

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue2rgb(h + 1 / 3) * 255, hue2rgb(h) * 255, hue2rgb(h - 1 / 3) * 255];
}

/** WCAG relative luminance, used only to pick a legible near-white/near-black foreground. */
function relativeLuminance(hex: string): number {
  const channels = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function pickForeground(bgHex: string): string {
  return relativeLuminance(bgHex) > 0.42 ? "#171717" : "#fafafa";
}

/** A page/header/footer/card background pushed to a dark, slightly desaturated surface. */
function toDarkSurface(hex: string): string {
  const [h, s] = rgbToHsl(...hexToRgb(hex));
  return rgbToHex(...hslToRgb(h, Math.min(s, 40), 11));
}

/** An accent color pushed brighter so it still reads clearly against a dark surface. */
function toDarkPrimary(hex: string): string {
  const [h, s] = rgbToHsl(...hexToRgb(hex));
  return rgbToHex(...hslToRgb(h, Math.max(s, 35), 62));
}

/**
 * Returns {} for both modes when no palette is set — callers should treat an
 * empty object as "don't override anything," which is what keeps a store
 * with no custom branding looking exactly like the app's current default.
 */
export function deriveStoreThemeVars(palette: BrandPalette | null): StoreThemeVars {
  if (!palette) return { light: {}, dark: {} };

  const light: Record<string, string> = {
    "--primary": palette.primary,
    "--primary-foreground": pickForeground(palette.primary),
    ...(palette.hover ? { "--primary-hover": palette.hover } : {}),
    "--background": palette.background,
    "--foreground": pickForeground(palette.background),
    "--card": palette.card,
    "--card-foreground": pickForeground(palette.card),
    "--header": palette.header,
    "--header-foreground": pickForeground(palette.header),
    "--footer": palette.footer,
    "--footer-foreground": pickForeground(palette.footer),
  };

  const darkPrimary = toDarkPrimary(palette.primary);
  const darkHover = palette.hover ? toDarkPrimary(palette.hover) : null;
  const darkBackground = toDarkSurface(palette.background);
  const darkCard = toDarkSurface(palette.card);
  const darkHeader = toDarkSurface(palette.header);
  const darkFooter = toDarkSurface(palette.footer);

  const dark: Record<string, string> = {
    "--primary": darkPrimary,
    "--primary-foreground": pickForeground(darkPrimary),
    ...(darkHover ? { "--primary-hover": darkHover } : {}),
    "--background": darkBackground,
    "--foreground": pickForeground(darkBackground),
    "--card": darkCard,
    "--card-foreground": pickForeground(darkCard),
    "--header": darkHeader,
    "--header-foreground": pickForeground(darkHeader),
    "--footer": darkFooter,
    "--footer-foreground": pickForeground(darkFooter),
  };

  return { light, dark };
}

/**
 * Renders the derived vars as a scoped stylesheet rather than inline `style`
 * attributes — an inline style would always win over the `.dark` stylesheet
 * rule below regardless of selector specificity, which would make dark mode
 * unable to override the light-mode values. `storeId` is our own uuid, not
 * user-authored text, so no escaping is needed for the selector.
 */
export function buildStoreThemeCss(storeId: string, vars: StoreThemeVars): string {
  if (Object.keys(vars.light).length === 0) return "";
  const toDecl = (map: Record<string, string>) =>
    Object.entries(map)
      .map(([key, value]) => `${key}: ${value};`)
      .join(" ");
  const scope = `[data-store-theme="${storeId}"]`;
  // The desktop nav is bg-transparent by default (floats over the hero
  // image) and stays that way for every store that hasn't set a palette —
  // this rule only exists at all when a palette is present, so it's the
  // only thing that ever tints it away from fully transparent.
  const headerTint = `background-color: color-mix(in srgb, var(--header) 72%, transparent);`;
  return (
    `${scope} { ${toDecl(vars.light)} } ` +
    `.dark ${scope} { ${toDecl(vars.dark)} } ` +
    `${scope} .store-desktop-header { ${headerTint} }`
  );
}
