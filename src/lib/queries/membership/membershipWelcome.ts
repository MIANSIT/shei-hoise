import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  buildMembershipPlainText,
  buildMembershipWelcomeHtml,
  sendMembershipWelcomeEmail,
  welcomeSubject,
} from "@/lib/email/membershipWelcomeEmail";
import { loadCardDesign, renderCardForStore, uploadMemberCardImage } from "./membershipCard";
import { todayInDhaka } from "./membershipTypes";
import { membershipFeatureEnabled } from "./membershipFeature";

// Server-only: sends a member's welcome email (their card shown inside it) and
// records how it went. No permission check here: callers are the permission-checked
// actions, or the automatic membership that was just earned.

export interface WelcomeEmailResult {
  status: "sent" | "failed" | "skipped";
  /** Why it was skipped or failed, in words the owner can act on. */
  error?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Welcome emails one store may send in a day, so one store can never use up the shared sending allowance. */
const DAILY_LIMIT = Number(process.env.MEMBERSHIP_EMAILS_PER_STORE_PER_DAY) || 200;

/** How many welcome emails this store has sent today (Bangladesh time). Zero when it can't be counted. */
async function sentToday(storeId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("customer_memberships")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .gte("welcome_email_sent_at", `${todayInDhaka()}T00:00:00+06:00`);
  return error ? 0 : (count ?? 0);
}

interface MembershipRow {
  id: string;
  customer_id: string;
  plan_id: string;
  membership_number: string;
  store_customers: { name: string | null; email: string | null } | null;
}

/** What the "Open Gmail" button needs to start a message for a member. */
export interface GmailDraft {
  to: string;
  subject: string;
  body: string;
  /** The store's own email address: the Gmail account to open the message in. */
  fromEmail: string | null;
  /** The member's card as a PNG data URL (null when the store has no card set up). */
  card: string | null;
  /**
   * The whole styled email (layout, colours, card) as HTML, ready to copy and paste into the message.
   * Null when the card could not be hosted at a web address, since a pasted card needs one.
   */
  html: string | null;
}

/** Longest body put into a Gmail link; very long links are cut off by browsers. */
const MAX_DRAFT_BODY = 1500;

/**
 * The same message the welcome email carries, as a draft for the store to open in its own Gmail.
 * The card travels separately because a link cannot attach a picture.
 */
export async function buildGmailDraft(storeId: string, membershipId: string): Promise<GmailDraft | null> {
  const { data } = await supabaseAdmin
    .from("customer_memberships")
    .select("id, plan_id, membership_number, store_customers(name, email)")
    .eq("id", membershipId)
    .eq("store_id", storeId)
    .maybeSingle();
  const membership = data as unknown as MembershipRow | null;
  if (!membership) return null;

  const { data: store } = await supabaseAdmin.from("stores").select("store_name, contact_email").eq("id", storeId).maybeSingle();
  const storeName = (store as { store_name?: string } | null)?.store_name ?? "";
  const design = await loadCardDesign(storeId, storeName);

  const { data: benefitRows } = await supabaseAdmin
    .from("membership_plan_benefits")
    .select("label, discount_percent")
    .eq("plan_id", membership.plan_id)
    .eq("store_id", storeId)
    .order("sort_order");
  const benefits = ((benefitRows ?? []) as { label: string; discount_percent: number | string }[]).map((b) => ({
    label: b.label,
    discountPercent: Number(b.discount_percent),
  }));

  const customerName = membership.store_customers?.name?.trim() || "Member";
  const params = { brand: design.emailBrand, customerName, membershipNumber: membership.membership_number, benefits, card: null };

  let card: string | null = null;
  let cardUrl: string | null = null;
  let png: Buffer | null = null;
  try {
    png = await renderCardForStore(storeId, storeName, customerName, membership.membership_number);
    if (png) {
      cardUrl = await uploadMemberCardImage(storeId, membership.id, png);
      // Smaller than the file that is emailed: it only has to paste into a message.
      const small = await sharp(png).resize({ width: 1000, withoutEnlargement: true }).png().toBuffer();
      card = `data:image/png;base64,${small.toString("base64")}`;
    }
  } catch (error) {
    console.error("buildGmailDraft: card could not be drawn:", error);
  }

  // The pasted email shows the card from its web address; with a card but no address there is nothing to paste.
  let html: string | null = null;
  if (!png || cardUrl) {
    const full = buildMembershipWelcomeHtml({ ...params, card: png, cardUrl });
    const inner = /<body[^>]*>([\s\S]*)<\/body>/i.exec(full)?.[1] ?? full;
    // The body tag's own look (font, colour, cream background) goes onto a wrapper so it survives the paste.
    html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#173f30;background-color:#f4f1e7;">${inner}</div>`;
  }

  return {
    to: membership.store_customers?.email ?? "",
    subject: welcomeSubject(design.emailBrand, customerName),
    body: buildMembershipPlainText(params).slice(0, MAX_DRAFT_BODY),
    fromEmail: (store as { contact_email?: string | null } | null)?.contact_email ?? null,
    card,
    html,
  };
}

/**
 * Sends the welcome email for one membership.
 * @param options.toEmail - Where to send it; defaults to the customer's saved email
 * @param options.force - Send even when the store has welcome emails switched off (a test or an explicit resend)
 */
export async function sendWelcomeForMembership(
  storeId: string,
  membershipId: string,
  options: { toEmail?: string | null; force?: boolean } = {},
): Promise<WelcomeEmailResult> {
  try {
    if (!(await membershipFeatureEnabled(storeId))) {
      return { status: "skipped", error: "Memberships are not part of this store's plan." };
    }

    const { data } = await supabaseAdmin
      .from("customer_memberships")
      .select("id, customer_id, plan_id, membership_number, store_customers(name, email)")
      .eq("id", membershipId)
      .eq("store_id", storeId)
      .maybeSingle();
    const membership = data as unknown as MembershipRow | null;
    if (!membership) return { status: "failed", error: "Membership not found" };

    const { data: store } = await supabaseAdmin.from("stores").select("store_name, contact_email").eq("id", storeId).maybeSingle();
    const storeName = (store as { store_name?: string } | null)?.store_name ?? "";
    const replyTo = (store as { contact_email?: string | null } | null)?.contact_email ?? null;

    const design = await loadCardDesign(storeId, storeName);
    if (!design.emailEnabled && !options.force) {
      return { status: "skipped", error: "Welcome emails are switched off in the Card & email tab." };
    }

    const to = (options.toEmail ?? membership.store_customers?.email ?? "").trim();
    if (!to) return { status: "skipped", error: "This customer has no email address." };
    if (!EMAIL.test(to)) return { status: "failed", error: "That email address does not look right." };

    if ((await sentToday(storeId)) >= DAILY_LIMIT) {
      return { status: "skipped", error: `The daily limit of ${DAILY_LIMIT} welcome emails has been reached. Try again tomorrow.` };
    }

    const { data: benefitRows } = await supabaseAdmin
      .from("membership_plan_benefits")
      .select("label, discount_percent")
      .eq("plan_id", membership.plan_id)
      .eq("store_id", storeId)
      .order("sort_order");
    const benefits = ((benefitRows ?? []) as { label: string; discount_percent: number | string }[]).map((b) => ({
      label: b.label,
      discountPercent: Number(b.discount_percent),
    }));

    const customerName = membership.store_customers?.name?.trim() || "Member";
    let status: WelcomeEmailResult = { status: "sent" };
    try {
      const card = await renderCardForStore(storeId, storeName, customerName, membership.membership_number);
      const cardUrl = card ? await uploadMemberCardImage(storeId, membership.id, card) : null;
      await sendMembershipWelcomeEmail({
        to,
        brand: design.emailBrand,
        customerName,
        membershipNumber: membership.membership_number,
        benefits,
        card,
        cardUrl,
        replyTo,
      });
    } catch (error) {
      status = { status: "failed", error: error instanceof Error ? error.message : "The email could not be sent." };
    }

    // Remember how it went. Written separately and its failure ignored, so a database that
    // has not got these columns yet (migration 20261111) still sends the email.
    await supabaseAdmin
      .from("customer_memberships")
      .update(
        status.status === "sent"
          ? { welcome_email_to: to, welcome_email_sent_at: new Date().toISOString(), welcome_email_error: null }
          : { welcome_email_to: to, welcome_email_error: status.error ?? "Failed" },
      )
      .eq("id", membershipId)
      .eq("store_id", storeId);

    // The owner typed an address for a customer who had none: keep it for next time.
    if (status.status === "sent" && !membership.store_customers?.email) {
      await supabaseAdmin.from("store_customers").update({ email: to }).eq("id", membership.customer_id).is("email", null);
    }
    return status;
  } catch (error) {
    console.error("sendWelcomeForMembership failed:", error);
    return { status: "failed", error: error instanceof Error ? error.message : "The email could not be sent." };
  }
}
