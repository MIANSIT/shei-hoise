// Client-safe types and constants for the membership card and welcome email.

export type CardFontKey = "lora-bold" | "playfair-bold" | "notosans-bold" | "dmserif";

/** The fonts a store can pick for the name and the number on its card (files live in public/fonts). */
export const CARD_FONT_OPTIONS: readonly { key: CardFontKey; label: string }[] = [
  { key: "lora-bold", label: "Lora Bold (serif)" },
  { key: "playfair-bold", label: "Playfair Display Bold (serif)" },
  { key: "dmserif", label: "DM Serif Display (heavy serif)" },
  { key: "notosans-bold", label: "Noto Sans Bold (sans-serif)" },
];

export type CardAlign = "left" | "center" | "right";

/** Where one piece of text goes on the card picture, in pixels of that picture. */
export interface CardSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  fontKey: CardFontKey;
  /** #rrggbb */
  color: string;
  align: CardAlign;
}

/** The wording and colours of the welcome email. Every field has a default, so a store only changes what it wants. */
export interface EmailBrand {
  storeName: string;
  tagline: string;
  programName: string;
  heroLine: string;
  /** Optional emoji after the store name in the welcome paragraph, e.g. a paw. */
  emoji: string;
  introLine: string;
  thanksLine: string;
  closingLine: string;
  /** The small heading above the card picture. */
  cardHeading: string;
  /** Subject line; {name} becomes the member's name. */
  subject: string;
  /** Header, headings and the footer bar. */
  colorPrimary: string;
  colorDeep: string;
  colorGold: string;
}

export interface CardDesignView {
  imageWidth: number | null;
  imageHeight: number | null;
  hasCard: boolean;
  nameSlot: CardSlot | null;
  numberSlot: CardSlot | null;
  emailEnabled: boolean;
  emailBrand: EmailBrand;
}

export interface CardActionResult {
  success: boolean;
  error?: string;
}

export const DEFAULT_NAME_SLOT_STYLE = { fontKey: "lora-bold" as CardFontKey, color: "#0b4d36", align: "left" as CardAlign };

/** The email wording a store gets before it changes anything: plain and not specific to any kind of shop. */
export function defaultEmailBrand(storeName: string): EmailBrand {
  const name = storeName.trim() || "Our Store";
  return {
    storeName: name,
    tagline: "THANK YOU FOR SHOPPING WITH US.",
    programName: `${name} Membership Program`,
    heroLine: "Your membership starts here",
    emoji: "",
    introLine: "Your loyalty deserves something special, and we're excited to make shopping with us even more rewarding.",
    thanksLine: "Thank you for being a part of our journey. We look forward to serving you again and again.",
    closingLine: "More Care. More Savings.",
    cardHeading: "YOUR MEMBERSHIP CARD",
    subject: `Welcome to the ${name} Family, {name}! Your membership card`,
    colorPrimary: "#f45549",
    colorDeep: "#07543b",
    colorGold: "#d9a441",
  };
}

/** Fills any missing or blank field of a saved brand from the defaults. */
export function mergeEmailBrand(saved: Partial<EmailBrand> | null | undefined, storeName: string): EmailBrand {
  const base = defaultEmailBrand(storeName);
  const merged: EmailBrand = { ...base };
  for (const key of Object.keys(base) as (keyof EmailBrand)[]) {
    const value = saved?.[key];
    if (typeof value !== "string") continue;
    // A blank value falls back to the default, except the emoji, which may be left empty on purpose.
    if (value.trim() || key === "emoji") merged[key] = value.trim();
  }
  return merged;
}
