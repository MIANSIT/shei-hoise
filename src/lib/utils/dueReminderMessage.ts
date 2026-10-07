import { formatDate, formatDateShort } from "@/lib/utils/formatDate";

export type DueReminderLanguage = "bn" | "en";

interface DueReminderInput {
  language: DueReminderLanguage;
  customerName: string | null;
  storeName: string;
  /** Currency symbol or code, e.g. "৳". */
  currency: string;
  amount: number;
  /** Date of the oldest unpaid order (YYYY-MM-DD or ISO). */
  dueSince?: string | null;
  /** Phone or WhatsApp number to pay / ask on, if the store has one. */
  contactPhone?: string | null;
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

const toBanglaDigits = (text: string): string => text.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

const formatAmount = (amount: number): string =>
  amount.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });

/**
 * A polite payment reminder to send a customer over WhatsApp. It states the
 * amount and how long it has been due, and thanks them — no pressure or threats.
 */
export function buildDueReminderMessage({
  language,
  customerName,
  storeName,
  currency,
  amount,
  dueSince,
  contactPhone,
}: DueReminderInput): string {
  const money = `${currency}${formatAmount(amount)}`;
  // Bangla digits read better with a numeric date; English keeps "03 Oct 2026".
  const since = dueSince ? (language === "bn" ? formatDate(dueSince) : formatDateShort(dueSince)) : "";

  if (language === "bn") {
    const lines = [
      `আসসালামু আলাইকুম${customerName ? `, ${customerName}` : ""}।`,
      "",
      `${storeName} থেকে আপনাকে একটি বিনীত অনুস্মারক। আপনার কাছে আমাদের ${toBanglaDigits(money)} বকেয়া রয়েছে${since ? ` (${toBanglaDigits(since)} থেকে)` : ""}।`,
      "",
      "অনুগ্রহ করে সুবিধামতো সময়ে পরিশোধ করলে আমরা কৃতজ্ঞ থাকব।" +
        (contactPhone ? ` কোনো প্রশ্ন থাকলে ${toBanglaDigits(contactPhone)} নম্বরে যোগাযোগ করতে পারেন।` : ""),
      "",
      `আমাদের সাথে থাকার জন্য ধন্যবাদ।`,
      storeName,
    ];
    return lines.join("\n");
  }

  const lines = [
    `Dear ${customerName || "Customer"},`,
    "",
    `This is a friendly reminder from ${storeName}. You have an outstanding balance of ${money}${since ? ` (since ${since})` : ""}.`,
    "",
    "We would be grateful if you could arrange payment at your earliest convenience." +
      (contactPhone ? ` If you have any questions, please contact us on ${contactPhone}.` : ""),
    "",
    "Thank you for shopping with us.",
    storeName,
  ];
  return lines.join("\n");
}
