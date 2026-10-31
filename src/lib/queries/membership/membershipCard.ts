import fs from "fs";
import path from "path";
import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toPublicStorageUrl } from "@/lib/supabase/publicUrl";
import {
  mergeEmailBrand,
  type CardFontKey,
  type CardSlot,
  type EmailBrand,
} from "./membershipCardTypes";

// Server-only: draws a member's name and number onto the store's own card
// picture. The picture is the store's blank card (name and number already taken
// out); the same pixels sit under every member's card, only the two pieces of
// text change.

export const CARD_BUCKET = "membership-cards";
/** Public bucket holding each member's finished card, so a welcome email can show it from a web address. */
export const CARD_IMAGE_BUCKET = "membership-card-images";

interface FontFile {
  /** The name fontconfig knows the file by, as "Family Style". */
  pango: string;
  file: string;
}

const FONT_FILES: Record<CardFontKey, FontFile> = {
  "lora-bold": { pango: "Lora Bold", file: "Lora-Bold.ttf" },
  "playfair-bold": { pango: "Playfair Display Bold", file: "PlayfairDisplay-Bold.ttf" },
  dmserif: { pango: "DM Serif Display", file: "DMSerifDisplay-Regular.ttf" },
  "notosans-bold": { pango: "Noto Sans Bold", file: "NotoSans-Bold.ttf" },
};

const BENGALI_FONT: FontFile = { pango: "Noto Sans Bengali", file: "NotoSansBengali-Regular.ttf" };
const BENGALI = /[ঀ-৿]/;

const fontPath = (file: string) => path.join(process.cwd(), "public", "fonts", file);

/** Pango markup treats & < > as syntax, so a name with them must be escaped. */
const markupEscape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A rectangle clamped to the picture, as whole pixels. */
function clampRect(rect: Rect, width: number, height: number): Rect {
  const x = Math.max(0, Math.min(width - 1, Math.round(rect.x)));
  const y = Math.max(0, Math.min(height - 1, Math.round(rect.y)));
  return {
    x,
    y,
    width: Math.max(1, Math.min(width - x, Math.round(rect.width))),
    height: Math.max(1, Math.min(height - y, Math.round(rect.height))),
  };
}

/**
 * Takes the old text out of the chosen rectangles: each row is filled by blending the
 * colour just left of the rectangle into the colour just right of it. That leaves no
 * mark on a plain or gently shaded background; a busy background needs a blank card
 * uploaded instead.
 */
export async function eraseSlots(png: Buffer, rects: readonly Rect[]): Promise<Buffer> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const C = 4;
  const margin = 3;
  const pixel = (x: number, y: number) => {
    const i = (y * W + x) * C;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  for (const raw of rects) {
    const r = clampRect(raw, W, H);
    for (let y = r.y; y < r.y + r.height; y++) {
      const left = pixel(Math.max(0, r.x - margin), y);
      const right = pixel(Math.min(W - 1, r.x + r.width + margin), y);
      for (let x = r.x; x < r.x + r.width; x++) {
        const t = r.width > 1 ? (x - r.x) / (r.width - 1) : 0;
        const i = (y * W + x) * C;
        for (let k = 0; k < C; k++) data[i + k] = Math.round(left[k] + (right[k] - left[k]) * t);
      }
    }
  }
  return sharp(data, { raw: { width: W, height: H, channels: C } }).png().toBuffer();
}

/** The text drawn as its own transparent picture, as large as fits inside the slot. */
async function textLayer(text: string, slot: CardSlot): Promise<{ data: Buffer; width: number; height: number }> {
  const font = BENGALI.test(text) ? BENGALI_FONT : (FONT_FILES[slot.fontKey] ?? FONT_FILES["lora-bold"]);
  const file = fontPath(font.file);
  if (!fs.existsSync(file)) throw new Error(`The card font ${font.file} is missing from the server.`);

  const markup = `<span foreground="${slot.color}">${markupEscape(text)}</span>`;
  for (let size = Math.min(160, Math.floor(slot.height * 0.85)); size >= 10; size -= 2) {
    const { data, info } = await sharp({
      text: { text: markup, font: `${font.pango} ${size}`, fontfile: file, rgba: true, wrap: "none" },
    })
      .png()
      .toBuffer({ resolveWithObject: true });
    if (info.width <= slot.width && info.height <= slot.height) return { data, width: info.width, height: info.height };
  }
  throw new Error("The text does not fit its box on the card. Make the box bigger.");
}

/**
 * One member's card: the store's blank card with their name and number written into the two boxes.
 * @returns the finished card as a PNG, the same size as the blank card
 */
export async function renderMemberCard(
  blank: Buffer,
  nameSlot: CardSlot,
  numberSlot: CardSlot,
  name: string,
  number: string,
): Promise<Buffer> {
  const layers = [] as { input: Buffer; left: number; top: number }[];
  for (const [text, slot] of [
    [name, nameSlot],
    [number, numberSlot],
  ] as const) {
    if (!text.trim()) continue;
    const layer = await textLayer(text.trim(), slot);
    const left =
      slot.align === "center"
        ? slot.x + Math.round((slot.width - layer.width) / 2)
        : slot.align === "right"
          ? slot.x + slot.width - layer.width
          : slot.x;
    layers.push({ input: layer.data, left, top: slot.y + Math.round((slot.height - layer.height) / 2) });
  }
  return sharp(blank).composite(layers).png().toBuffer();
}

/** The store's design row as the code uses it. */
export interface StoredCardDesign {
  blankPath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  nameSlot: CardSlot | null;
  numberSlot: CardSlot | null;
  emailEnabled: boolean;
  emailBrand: EmailBrand;
}

/** Loads a store's card design; a store that has not set one up gets plain defaults (no card, email on). */
export async function loadCardDesign(storeId: string, storeName: string): Promise<StoredCardDesign> {
  const { data } = await supabaseAdmin.from("membership_card_designs").select("*").eq("store_id", storeId).maybeSingle();
  const row = data as {
    blank_path: string | null;
    image_width: number | null;
    image_height: number | null;
    name_slot: CardSlot | null;
    number_slot: CardSlot | null;
    email_enabled: boolean;
    email_brand: Partial<EmailBrand> | null;
  } | null;
  return {
    blankPath: row?.blank_path ?? null,
    imageWidth: row?.image_width ?? null,
    imageHeight: row?.image_height ?? null,
    nameSlot: row?.name_slot ?? null,
    numberSlot: row?.number_slot ?? null,
    emailEnabled: row?.email_enabled ?? true,
    emailBrand: mergeEmailBrand(row?.email_brand, storeName),
  };
}

export async function downloadBlankCard(blankPath: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage.from(CARD_BUCKET).download(blankPath);
  if (error || !data) throw new Error(error?.message ?? "The card picture could not be read.");
  return Buffer.from(await data.arrayBuffer());
}

export async function uploadBlankCard(storeId: string, png: Buffer): Promise<string> {
  const blankPath = `${storeId}/blank.png`;
  const { error } = await supabaseAdmin.storage
    .from(CARD_BUCKET)
    .upload(blankPath, png, { contentType: "image/png", upsert: true, cacheControl: "60" });
  if (error) throw new Error(`The card picture could not be saved: ${error.message}`);
  return blankPath;
}

/**
 * Saves a finished card where a mail app can fetch it from a web address.
 * The file is named after the membership's random id, so the address cannot be guessed.
 * @param name - The file name without extension: the membership's id, or "sample" for a test email
 * @returns the public address, or null when it could not be saved (the email then carries the card as an attachment)
 */
export async function uploadMemberCardImage(storeId: string, name: string, png: Buffer): Promise<string | null> {
  try {
    const filePath = `${storeId}/${name}.png`;
    const { error } = await supabaseAdmin.storage
      .from(CARD_IMAGE_BUCKET)
      .upload(filePath, png, { contentType: "image/png", upsert: true, cacheControl: "300" });
    if (error) {
      console.error("uploadMemberCardImage failed:", error.message);
      return null;
    }
    const { data } = supabaseAdmin.storage.from(CARD_IMAGE_BUCKET).getPublicUrl(filePath);
    return toPublicStorageUrl(data.publicUrl);
  } catch (error) {
    console.error("uploadMemberCardImage failed:", error);
    return null;
  }
}

/** Removes a member's hosted card (best effort: a missing file or bucket is not an error). */
export async function deleteMemberCardImage(storeId: string, membershipId: string): Promise<void> {
  try {
    await supabaseAdmin.storage.from(CARD_IMAGE_BUCKET).remove([`${storeId}/${membershipId}.png`]);
  } catch (error) {
    console.error("deleteMemberCardImage failed:", error);
  }
}

/** A card for a member of this store, or null when the store has not finished setting its card up. */
export async function renderCardForStore(
  storeId: string,
  storeName: string,
  name: string,
  number: string,
): Promise<Buffer | null> {
  const design = await loadCardDesign(storeId, storeName);
  if (!design.blankPath || !design.nameSlot || !design.numberSlot) return null;
  const blank = await downloadBlankCard(design.blankPath);
  return renderMemberCard(blank, design.nameSlot, design.numberSlot, name, number);
}
