/** One line of a level's benefits: a wording, a discount and the categories it covers. */
export interface MembershipBenefit {
  /** What the customer reads, e.g. "Treats, Canned Food & Veterinary Items". */
  label: string;
  discountPercent: number;
  /** Product categories this row covers; empty means every product. */
  categoryIds: string[];
}

/** A membership level (e.g. Silver, Gold) of one store. */
export interface MembershipPlan {
  id: string;
  name: string;
  isActive: boolean;
  benefits: MembershipBenefit[];
  /** How many customers hold this level right now. */
  memberCount: number;
  /** Lifetime spend that earns this level automatically; null = only given by hand. */
  minSpend: number | null;
  /** Start of the number an automatic membership gets (e.g. "PAW-126" → PAW-126-001). */
  numberPrefix: string | null;
}

export interface MembershipPlanInput {
  name: string;
  isActive: boolean;
  benefits: MembershipBenefit[];
  /** Lifetime spend that earns the level automatically; null/omitted = only given by hand. */
  minSpend?: number | null;
  /** Needed when minSpend is set. */
  numberPrefix?: string | null;
}

export type MembershipStatus = "active" | "expired";

/** A customer holding a membership. */
export interface Member {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  planId: string;
  planName: string;
  /** Typed by the store, e.g. Paw-226-002. */
  membershipNumber: string;
  /** YYYY-MM-DD */
  startsOn: string;
  /** YYYY-MM-DD, or null for no end date. */
  endsOn: string | null;
  notes: string | null;
  status: MembershipStatus;
  /** "auto" = earned by spending; "manual" = given by an admin. */
  source: "manual" | "auto";
  /** When the welcome email last went out (null = never), where to, and why it failed if it did. */
  welcomeEmailSentAt: string | null;
  welcomeEmailTo: string | null;
  welcomeEmailError: string | null;
}

export interface MembershipInput {
  customerId: string;
  planId: string;
  membershipNumber: string;
  startsOn: string;
  endsOn?: string | null;
  notes?: string;
  /** Where to send the welcome email. */
  email?: string;
  /** Send the welcome email now (when giving a membership) or again (when editing one). */
  sendWelcomeEmail?: boolean;
}

/** A customer found while choosing who to give a membership to. */
export interface MembershipCustomerOption {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  /** Already has a membership in this store (so cannot be given another). */
  isMember: boolean;
}

export interface MembershipResult {
  success: boolean;
  error?: string;
  /** How the welcome email went, when one was asked for. */
  emailResult?: { status: "sent" | "failed" | "skipped"; error?: string };
}

/** A discount line of an order, as the member discount is worked out from it. */
export interface MemberDiscountLine {
  productId: string;
  quantity: number;
  /** The price one unit is actually sold at. */
  unitPrice: number;
}

export interface MemberDiscountLineResult {
  productId: string;
  percent: number;
  amount: number;
}

/** What a customer's membership takes off an order. `membership` is null when they have none that is valid today. */
export interface MemberDiscountResult {
  membership: { id: string; number: string; planName: string } | null;
  discount: number;
  lines: MemberDiscountLineResult[];
}

/** A customer's membership as shown beside their details on an order. */
export interface CustomerMembershipSummary {
  number: string;
  planName: string;
  status: MembershipStatus;
}

/** A member found by their membership number, for filling in who is buying. */
export interface MemberLookup {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  membershipNumber: string;
  planName: string;
  status: MembershipStatus;
}

/** Today's date (YYYY-MM-DD) in Bangladesh, so a membership ends on the shop's own calendar day. */
export function todayInDhaka(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
}

/** A membership is expired once its end date has passed (the end day itself still counts). */
export function membershipStatus(endsOn: string | null, today: string): MembershipStatus {
  return endsOn && endsOn < today ? "expired" : "active";
}
