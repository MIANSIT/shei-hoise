import { getMailSender } from "./mailTransport";
import { MEMBERSHIP_CARD_SECTION, MEMBERSHIP_WELCOME_TEMPLATE } from "./membershipWelcomeTemplate";
import type { EmailBrand } from "@/lib/queries/membership/membershipCardTypes";

/** One line of the benefits table: the wording and the percent. */
export interface WelcomeBenefit {
  label: string;
  discountPercent: number;
}

export interface SendMembershipWelcomeParams {
  to: string;
  brand: EmailBrand;
  customerName: string;
  membershipNumber: string;
  benefits: readonly WelcomeBenefit[];
  /** The member's card picture (PNG), or null when the store has not set a card up. */
  card: Buffer | null;
  /**
   * Where mail apps can fetch the card from. With it the email shows the card from that address and
   * carries the file as an ordinary attachment; without it the card is attached inline (some mail apps miss that).
   */
  cardUrl?: string | null;
  /** Replies go here (the store's own contact email), not to the sending account. */
  replyTo?: string | null;
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const HEX = /^#[0-9a-f]{6}$/i;
const safeColor = (value: string, fallback: string) => (HEX.test(value) ? value : fallback);

/** The card picture is attached to the email under this id and shown inline in the body. */
const CARD_CONTENT_ID = "membership-card";

const percentText = (value: number) => `${Number.isInteger(value) ? value : Number(value.toFixed(2))}% OFF`;

/** The benefit rows, in the email's own row style: the first, third... on the light background, the others plain. */
function benefitRowsHtml(benefits: readonly WelcomeBenefit[]): string {
  return benefits
    .map((b, index) => {
      const shaded = index % 2 === 0;
      const bg = shaded ? "background:#fffaf0;" : "";
      return `                <tr>
                  <td style="padding:13px 14px;border:1px solid #eadfbe;${bg}font-size:14px;color:#4a4436;">${escapeHtml(b.label)}</td>
                  <td align="right" style="padding:13px 14px;border:1px solid #eadfbe;${bg}font-size:18px;font-weight:bold;color:#a76a12;white-space:nowrap;">${escapeHtml(percentText(b.discountPercent))}</td>
                </tr>`;
    })
    .join("\n");
}

/** The brand's wording with every placeholder of the template filled in; values are escaped so a name can't break the layout. */
export function buildMembershipWelcomeHtml(params: Omit<SendMembershipWelcomeParams, "to" | "replyTo">): string {
  const { brand, customerName, membershipNumber, benefits, card } = params;
  const closingPlain = brand.closingLine.replace(/\p{Extended_Pictographic}/gu, "").replace(/\s+/g, " ").trim();

  const values: Record<string, string> = {
    color_primary: safeColor(brand.colorPrimary, "#f45549"),
    color_deep: safeColor(brand.colorDeep, "#07543b"),
    color_gold: safeColor(brand.colorGold, "#d9a441"),
    store_name: escapeHtml(brand.storeName),
    tagline: escapeHtml(brand.tagline),
    hero_line: escapeHtml(brand.heroLine),
    emoji: brand.emoji ? ` ${escapeHtml(brand.emoji)}` : "",
    program_name: escapeHtml(brand.programName),
    intro_line: escapeHtml(brand.introLine),
    thanks_line: escapeHtml(brand.thanksLine),
    closing_line: escapeHtml(brand.closingLine),
    closing_plain: escapeHtml(closingPlain),
    customer_name: escapeHtml(customerName),
    membership_id: escapeHtml(membershipNumber),
    benefit_rows: benefitRowsHtml(benefits),
  };

  const cardSection = card
    ? MEMBERSHIP_CARD_SECTION.replace("{{card_heading}}", escapeHtml(brand.cardHeading))
        .replace("{{card_image_src}}", params.cardUrl ? escapeHtml(params.cardUrl) : `cid:${CARD_CONTENT_ID}`)
        .replace("{{card_alt}}", escapeHtml(`${brand.storeName} membership card`))
    : "";

  // One pass over the template, so a value that happens to contain "{{...}}" is never filled in again.
  const withCard = MEMBERSHIP_WELCOME_TEMPLATE.replace("{{card_section}}\n", () => (cardSection ? `${cardSection}\n` : ""));
  return withCard.replace(/\{\{([a-z_]+)\}\}/g, (match, key: string) => values[key] ?? match);
}

/** The email's text version: also the body of the draft the "Open Gmail" button fills in. */
export function buildMembershipPlainText(params: Omit<SendMembershipWelcomeParams, "to" | "replyTo">): string {
  const { brand, customerName, membershipNumber, benefits } = params;
  return [
    `Welcome to the ${brand.storeName} Family!`,
    brand.heroLine,
    "",
    `Dear ${customerName},`,
    "",
    `Welcome to the ${brand.storeName} family! We're delighted to have you as a member of our ${brand.programName}.`,
    brand.introLine,
    "",
    `Membership ID: ${membershipNumber}`,
    "Please keep your membership ID handy when shopping.",
    "",
    "Your exclusive membership benefits",
    ...benefits.map((b) => `- ${b.label}: ${percentText(b.discountPercent)}`),
    "",
    `To claim your discounts, please present your membership card or provide your membership ID when shopping at ${brand.storeName}.`,
    brand.thanksLine,
    "",
    brand.closingLine,
    `With love, Team ${brand.storeName}`,
  ].join("\n");
}

/** The subject, with {name} replaced by the member's name. */
export function welcomeSubject(brand: EmailBrand, customerName: string): string {
  // One line only: a line break in the wording or the name must never become a mail header.
  return brand.subject
    .replace(/\{name\}/g, customerName.trim() || "Member")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

/**
 * Sends the welcome email, with the member's card shown inside it. It goes out under the store's
 * own name, through the platform's mail service (or its Gmail account when no service is set up).
 * @throws when the sending account is not set up or the mail server refuses the message
 */
export async function sendMembershipWelcomeEmail(params: SendMembershipWelcomeParams): Promise<void> {
  const sender = getMailSender();
  if (!sender) throw new Error("Email sending is not set up on the server.");
  if (!params.to) throw new Error("There is no email address to send to.");

  await sender.transporter.sendMail({
    from: `"${params.brand.storeName.replace(/["\r\n]/g, "")}" <${sender.fromAddress}>`,
    to: params.to,
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    subject: welcomeSubject(params.brand, params.customerName),
    text: buildMembershipPlainText(params),
    html: buildMembershipWelcomeHtml(params),
    attachments: !params.card
      ? []
      : params.cardUrl
        ? [{ filename: "membership-card.png", content: params.card, contentType: "image/png" }]
        : [{ filename: "membership-card.png", content: params.card, cid: CARD_CONTENT_ID, contentType: "image/png" }],
  });
}
