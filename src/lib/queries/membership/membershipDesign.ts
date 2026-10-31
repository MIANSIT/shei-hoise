"use server";

import { z } from "zod";
import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStore, logActivity } from "@/lib/permissions/server";
import { sendMembershipWelcomeEmail } from "@/lib/email/membershipWelcomeEmail";
import {
  downloadBlankCard,
  eraseSlots,
  loadCardDesign,
  renderMemberCard,
  uploadBlankCard,
  uploadMemberCardImage,
} from "./membershipCard";
import { buildGmailDraft, sendWelcomeForMembership, type GmailDraft } from "./membershipWelcome";
import {
  CARD_FONT_OPTIONS,
  type CardActionResult,
  type CardDesignView,
  type CardSlot,
  type EmailBrand,
} from "./membershipCardTypes";

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_SIDE = 4000;
const MIN_IMAGE_WIDTH = 400;
const PREVIEW_WIDTH = 1000;
const SAMPLE_NAME = "Sample Member";
const SAMPLE_NUMBER = "ABC-000-001";

const HEX = /^#[0-9a-fA-F]{6}$/;
const fontKeys = CARD_FONT_OPTIONS.map((f) => f.key) as [string, ...string[]];

const slotSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().min(10, "A box is too small"),
  height: z.number().int().min(10, "A box is too small"),
  fontKey: z.enum(fontKeys),
  color: z.string().regex(HEX, "Pick a colour for the text"),
  align: z.enum(["left", "center", "right"]),
});

const text = (label: string, max: number) =>
  z.string().trim().min(1, `Fill in ${label}`).max(max, `${label} is too long`);

const brandSchema = z.object({
  storeName: text("the store name", 60),
  tagline: text("the tagline", 80),
  programName: text("the programme name", 80),
  heroLine: text("the line under the heading", 120),
  emoji: z.string().trim().max(8, "Use one small emoji or none"),
  introLine: text("the welcome sentence", 300),
  thanksLine: text("the thank-you sentence", 300),
  closingLine: text("the closing line", 100),
  cardHeading: text("the card heading", 40),
  subject: text("the subject", 150),
  colorPrimary: z.string().regex(HEX, "Pick the three colours"),
  colorDeep: z.string().regex(HEX, "Pick the three colours"),
  colorGold: z.string().regex(HEX, "Pick the three colours"),
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function storeNameOf(storeId: string): Promise<string> {
  const { data } = await supabaseAdmin.from("stores").select("store_name").eq("id", storeId).maybeSingle();
  return (data as { store_name?: string } | null)?.store_name ?? "";
}

/** A smaller JPEG of a picture, for showing on screen; the full size stays on the server. */
async function asPreviewDataUrl(png: Buffer): Promise<string> {
  const jpeg = await sharp(png).resize({ width: PREVIEW_WIDTH, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

/**
 * The store's card picture setup and email wording, for the "Card & email" tab.
 * @returns the design, a small preview of the blank card, and the store's name; null when not allowed
 */
export async function getCardDesign(
  storeId: string,
): Promise<{ design: CardDesignView; blankPreview: string | null; storeName: string } | null> {
  try {
    const auth = await authorizeForStore(storeId, "memberships.view");
    if (!auth.ok) return null;
    const storeName = await storeNameOf(storeId);
    const stored = await loadCardDesign(storeId, storeName);

    let blankPreview: string | null = null;
    if (stored.blankPath) {
      try {
        blankPreview = await asPreviewDataUrl(await downloadBlankCard(stored.blankPath));
      } catch (error) {
        console.error("getCardDesign: blank card unreadable:", error);
      }
    }
    return {
      storeName,
      blankPreview,
      design: {
        imageWidth: stored.imageWidth,
        imageHeight: stored.imageHeight,
        hasCard: !!stored.blankPath && !!blankPreview,
        nameSlot: stored.nameSlot,
        numberSlot: stored.numberSlot,
        emailEnabled: stored.emailEnabled,
        emailBrand: stored.emailBrand,
      },
    };
  } catch (error) {
    console.error("getCardDesign failed:", error);
    return null;
  }
}

/**
 * Saves the card picture and where the name and number go on it. A new picture can have the old
 * name and number taken out of the two boxes; without a new picture only the boxes and their style change.
 * The form carries: file (optional), nameSlot and numberSlot (JSON), erase ("1" to take the old text out).
 */
export async function saveCardDesign(storeId: string, form: FormData): Promise<CardActionResult> {
  try {
    const auth = await authorizeForStore(storeId, "memberships.edit");
    if (!auth.ok) return { success: false, error: auth.error };

    const nameSlot = slotSchema.safeParse(JSON.parse(String(form.get("nameSlot") ?? "null")));
    const numberSlot = slotSchema.safeParse(JSON.parse(String(form.get("numberSlot") ?? "null")));
    if (!nameSlot.success || !numberSlot.success) {
      return { success: false, error: (nameSlot.error ?? numberSlot.error)?.issues[0]?.message ?? "Check the two boxes" };
    }
    const slots = { name: nameSlot.data as CardSlot, number: numberSlot.data as CardSlot };

    const file = form.get("file");
    const storeName = await storeNameOf(storeId);
    const existing = await loadCardDesign(storeId, storeName);

    let blank: Buffer;
    let width: number;
    let height: number;
    let blankPath = existing.blankPath;

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) return { success: false, error: "The picture is too big. Use one under 12 MB." };
      let png: Buffer;
      try {
        // limitInputPixels: a small file can hold a huge picture; refuse to unpack anything bigger than the size limit.
        png = await sharp(Buffer.from(await file.arrayBuffer()), {
          failOn: "none",
          limitInputPixels: MAX_IMAGE_SIDE * MAX_IMAGE_SIDE,
        })
          .rotate()
          .png()
          .toBuffer();
      } catch {
        return { success: false, error: "That file is not a picture we can read. Use a PNG or JPG." };
      }
      const meta = await sharp(png).metadata();
      width = meta.width ?? 0;
      height = meta.height ?? 0;
      if (width < MIN_IMAGE_WIDTH) return { success: false, error: `The picture is too small. It should be at least ${MIN_IMAGE_WIDTH} pixels wide.` };
      if (width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE) {
        return { success: false, error: `The picture is too large. Keep each side under ${MAX_IMAGE_SIDE} pixels.` };
      }
      blank = String(form.get("erase")) === "1" ? await eraseSlots(png, [slots.name, slots.number]) : png;
    } else {
      if (!existing.blankPath || !existing.imageWidth || !existing.imageHeight) {
        return { success: false, error: "Upload your card picture first." };
      }
      blank = await downloadBlankCard(existing.blankPath);
      width = existing.imageWidth;
      height = existing.imageHeight;
    }

    for (const slot of [slots.name, slots.number]) {
      if (slot.x + slot.width > width || slot.y + slot.height > height) {
        return { success: false, error: "A box goes outside the card picture. Move it back inside." };
      }
    }

    // A sample first: if the text cannot be drawn or does not fit, say so before anything is saved.
    try {
      await renderMemberCard(blank, slots.name, slots.number, SAMPLE_NAME, SAMPLE_NUMBER);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "The card could not be drawn." };
    }

    if (file instanceof File && file.size > 0) blankPath = await uploadBlankCard(storeId, blank);

    const { error } = await supabaseAdmin.from("membership_card_designs").upsert(
      {
        store_id: storeId,
        blank_path: blankPath,
        image_width: width,
        image_height: height,
        name_slot: slots.name,
        number_slot: slots.number,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" },
    );
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "memberships.edit",
      entityType: "membership_card_design",
      summary: file instanceof File && file.size > 0 ? "Uploaded a new membership card picture" : "Changed the membership card boxes",
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save the card" };
  }
}

/**
 * A sample card drawn from the saved picture and boxes, to check them before real members get one.
 * @returns a preview picture, or why there is none yet
 */
export async function previewCard(
  storeId: string,
  sample: { name?: string; number?: string } = {},
): Promise<{ success: boolean; image?: string; error?: string }> {
  try {
    const auth = await authorizeForStore(storeId, "memberships.view");
    if (!auth.ok) return { success: false, error: auth.error };
    const stored = await loadCardDesign(storeId, await storeNameOf(storeId));
    if (!stored.blankPath || !stored.nameSlot || !stored.numberSlot) {
      return { success: false, error: "Save your card picture and boxes first." };
    }
    const card = await renderMemberCard(
      await downloadBlankCard(stored.blankPath),
      stored.nameSlot,
      stored.numberSlot,
      (sample.name ?? "").trim().slice(0, 60) || SAMPLE_NAME,
      (sample.number ?? "").trim().slice(0, 40) || SAMPLE_NUMBER,
    );
    return { success: true, image: await asPreviewDataUrl(card) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "The sample could not be drawn" };
  }
}

/**
 * Saves the welcome email's wording and colours, and whether it is sent at all.
 * @returns success, or the first thing wrong with the wording
 */
export async function saveEmailSettings(
  storeId: string,
  input: { emailEnabled: boolean; brand: EmailBrand },
): Promise<CardActionResult> {
  try {
    const auth = await authorizeForStore(storeId, "memberships.edit");
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = brandSchema.safeParse(input.brand);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the wording" };

    const { error } = await supabaseAdmin.from("membership_card_designs").upsert(
      {
        store_id: storeId,
        email_enabled: !!input.emailEnabled,
        email_brand: parsed.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" },
    );
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "memberships.edit",
      entityType: "membership_card_design",
      summary: "Changed the membership welcome email",
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save the email settings" };
  }
}

/**
 * Sends the welcome email to one address with a sample member, so the owner sees exactly what members get.
 * @returns success, or why it could not be sent
 */
export async function sendTestWelcomeEmail(storeId: string, toEmail: string): Promise<CardActionResult> {
  try {
    const auth = await authorizeForStore(storeId, "memberships.edit");
    if (!auth.ok) return { success: false, error: auth.error };
    const to = toEmail.trim();
    if (!EMAIL.test(to)) return { success: false, error: "Enter a valid email address to send the test to." };

    const storeName = await storeNameOf(storeId);
    const stored = await loadCardDesign(storeId, storeName);

    // The discount rows of one of the store's own levels, so the test looks like the real thing.
    const { data: rows } = await supabaseAdmin
      .from("membership_plan_benefits")
      .select("label, discount_percent, plan_id")
      .eq("store_id", storeId)
      .order("plan_id")
      .order("sort_order")
      .limit(60);
    const all = (rows ?? []) as { label: string; discount_percent: number | string; plan_id: string }[];
    const firstPlan = all[0]?.plan_id;
    const benefits = all
      .filter((r) => r.plan_id === firstPlan)
      .map((r) => ({ label: r.label, discountPercent: Number(r.discount_percent) }));

    const { data: store } = await supabaseAdmin.from("stores").select("contact_email").eq("id", storeId).maybeSingle();

    let card: Buffer | null = null;
    if (stored.blankPath && stored.nameSlot && stored.numberSlot) {
      card = await renderMemberCard(await downloadBlankCard(stored.blankPath), stored.nameSlot, stored.numberSlot, SAMPLE_NAME, SAMPLE_NUMBER);
    }
    await sendMembershipWelcomeEmail({
      to,
      brand: stored.emailBrand,
      customerName: SAMPLE_NAME,
      membershipNumber: SAMPLE_NUMBER,
      benefits: benefits.length > 0 ? benefits : [{ label: "Your first discount row", discountPercent: 10 }],
      card,
      cardUrl: card ? await uploadMemberCardImage(storeId, "sample", card) : null,
      replyTo: (store as { contact_email?: string | null } | null)?.contact_email ?? null,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "The test email could not be sent" };
  }
}

/**
 * The welcome message as a draft for the store's own Gmail: address, subject, text, and the card picture.
 * @returns the draft, or null when the membership is not found or the caller may not see it
 */
export async function getGmailComposeDraft(storeId: string, membershipId: string): Promise<GmailDraft | null> {
  try {
    const auth = await authorizeForStore(storeId, "memberships.view");
    if (!auth.ok) return null;
    return await buildGmailDraft(storeId, membershipId);
  } catch (error) {
    console.error("getGmailComposeDraft failed:", error);
    return null;
  }
}

/**
 * Sends a member's welcome email again (or for the first time), to the given address.
 * @returns success, or why it could not be sent
 */
export async function resendWelcomeEmail(storeId: string, membershipId: string, toEmail: string): Promise<CardActionResult> {
  try {
    const auth = await authorizeForStore(storeId, "memberships.edit");
    if (!auth.ok) return { success: false, error: auth.error };
    const result = await sendWelcomeForMembership(storeId, membershipId, { toEmail, force: true });
    return result.status === "sent" ? { success: true } : { success: false, error: result.error ?? "The email could not be sent" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "The email could not be sent" };
  }
}
