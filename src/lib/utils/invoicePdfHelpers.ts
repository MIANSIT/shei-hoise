import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";
import { Currency } from "@/lib/types/enums";

// ==================== SHARED INVOICE PDF TYPES ====================
// Used by both the single-invoice route (/api/invoices/generate) and the
// bulk-invoice route (/api/invoices/generate-bulk).

export interface InvoicePdfProduct {
  name: string;
  qty: number;
  price: number;
}

export interface InvoicePdfStore {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo?: string | null;
}

export interface InvoicePdfCustomer {
  name: string;
  address?: string;
  contact?: string;
  email?: string;
}

export interface InvoicePdfAdditionalCharge {
  label: string;
  amount: number;
}

export interface InvoicePdfData {
  orderId: string;
  customer: InvoicePdfCustomer;
  products: InvoicePdfProduct[];
  currency: Currency;
  subtotal: number;
  deliveryCharge: number;
  taxAmount: number;
  discountAmount?: number;
  /** What the customer's membership took off (not part of discountAmount). */
  memberDiscount?: number;
  /** The customer's membership number, printed under their details when they are a member. */
  memberNumber?: string | null;
  additionalCharges?: InvoicePdfAdditionalCharge[];
  totalDue: number;
  /** Sum of any customer_payments recorded against this order (advance/partial payment). */
  amountPaid?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  orderStatus?: string;
  notes?: string;
  orderCreatedAt?: string | null;
  /** Stores with branches: this invoice's own header (its branch), instead of the request's shared store. */
  store?: InvoicePdfStore;
}

// ==================== BENGALI FONT SUPPORT ====================
let bengaliFontCache: { regular: string | null; bold: string | null } | null =
  null;

export function getBengaliFontData(): {
  regular: string | null;
  bold: string | null;
} {
  if (bengaliFontCache !== null) return bengaliFontCache;
  try {
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    const regularPath = path.join(fontsDir, "NotoSansBengali-Regular.ttf");
    const boldPath = path.join(fontsDir, "NotoSansBengali-Bold.ttf");
    bengaliFontCache = {
      regular: fs.existsSync(regularPath)
        ? fs.readFileSync(regularPath).toString("base64")
        : null,
      bold: fs.existsSync(boldPath)
        ? fs.readFileSync(boldPath).toString("base64")
        : null,
    };
  } catch {
    bengaliFontCache = { regular: null, bold: null };
  }
  return bengaliFontCache;
}

export function hasBengali(text: string): boolean {
  return /[ঀ-৿]/.test(text);
}

export function registerBengaliFont(pdf: jsPDF): boolean {
  const fontData = getBengaliFontData();
  if (!fontData.regular) return false;
  try {
    pdf.addFileToVFS("NotoSansBengali-Regular.ttf", fontData.regular);
    pdf.addFont("NotoSansBengali-Regular.ttf", "NotoSansBengali", "normal");

    // Verify registration succeeded (jsPDF fires PubSub errors without throwing)
    const fontList = pdf.getFontList();
    if (!fontList["NotoSansBengali"]) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Sets Bengali font if the text contains Bengali characters, otherwise keeps
 * the current font unchanged. Call pdf.setFont(...) to restore after use.
 */
export function applyBengaliFont(
  pdf: jsPDF,
  text: string,
  bengaliLoaded: boolean,
): boolean {
  if (bengaliLoaded && hasBengali(text)) {
    pdf.setFont("NotoSansBengali", "normal");
    return true;
  }
  return false;
}

// Formats a status string like "partially_paid" -> "Partially Paid".
export function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Longest address a customer invoice will print; anything beyond is cut with "...". */
export const MAX_ADDRESS_CHARS = 240;

/**
 * Collapses runs of whitespace/newlines and cuts text to `max` characters. A
 * PDF can't use more than a few lines of text per field anyway, and measuring
 * or drawing an enormous Bangla string is what ran the server out of memory.
 */
export function clampText(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 3).trimEnd()}...` : flat;
}
