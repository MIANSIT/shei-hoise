import nodemailer from "nodemailer";

interface SubscriptionRequestNoticeParams {
  storeName: string;
  ownerEmail: string;
  invoiceNumber: string;
  planName: string;
  billingCycle: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentReference: string;
  senderNumber: string;
  notes?: string | null;
  /** Omitted when the caller can't tell (e.g. paying an already-created invoice). */
  requestType?: "new" | "renewal" | "switch";
}

const REQUEST_TYPE_LABEL: Record<NonNullable<SubscriptionRequestNoticeParams["requestType"]>, string> = {
  new: "New subscription",
  renewal: "Renewal",
  switch: "Plan switch",
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Tells the Shei Hoise team (the same Gmail account that sends our mail) that a
 * store submitted a plan payment waiting for approval. Sent to ourselves.
 */
export async function sendSubscriptionRequestAdminNotice(
  params: SubscriptionRequestNoticeParams
): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn("⚠️ Subscription notice skipped: GMAIL_USER or GMAIL_APP_PASSWORD not set.");
    return;
  }

  const typeLabel = params.requestType ? REQUEST_TYPE_LABEL[params.requestType] : null;

  const lines = [
    typeLabel ? `Type: ${typeLabel}` : "",
    `Store: ${params.storeName}`,
    `Owner email: ${params.ownerEmail}`,
    `Invoice: ${params.invoiceNumber}`,
    `Plan: ${params.planName} (${params.billingCycle})`,
    `Amount: ${params.amount} ${params.currency}`,
    `Method: ${params.paymentMethod}`,
    `Reference: ${params.paymentReference}`,
    `Sender number: ${params.senderNumber}`,
    params.notes ? `Notes: ${params.notes}` : "",
  ].filter(Boolean);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"Shei Hoise" <${user}>`,
    to: user,
    replyTo: params.ownerEmail,
    subject: `${typeLabel ? `${typeLabel} — ` : ""}Plan payment to review — ${params.storeName} (${params.planName})`,
    text: ["A store submitted a plan payment. Please review and approve it.", "", ...lines].join("\n"),
    html: `<p>A store submitted a plan payment. Please review and approve it.</p><p>${lines
      .map((line) => escapeHtml(line))
      .join("<br />")}</p>`,
  });
}
