/**
 * Every permission a staff role can be given, grouped by dashboard area.
 *
 * A permission is "<area>.<action>", e.g. "orders.delete". The same strings
 * are stored in store_roles.permissions and checked by
 * public.has_store_permission() in SQL, so renaming one here needs a data
 * migration for existing roles.
 *
 * The store owner is never checked against this list — they can do
 * everything. Store settings, courier accounts, subscription, staff and roles
 * are owner-only and deliberately have no permission here, so they can never
 * be handed to a role.
 */

export type PermissionAction = "view" | "add" | "edit" | "delete";

export interface PermissionExtra {
  readonly key: string;
  readonly label: string;
  readonly labelBn: string;
}

export interface PermissionArea {
  readonly key: string;
  readonly label: string;
  readonly labelBn: string;
  /** One line under the area name saying what it covers. */
  readonly hint: string;
  readonly hintBn: string;
  /** Which of View / Add / Edit / Delete exist for this area. */
  readonly actions: readonly PermissionAction[];
  readonly extras: readonly PermissionExtra[];
}

export const PERMISSION_AREAS: readonly PermissionArea[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    labelBn: "ড্যাশবোর্ড",
    hint: "Sales, profit and stock summary on the home page",
    hintBn: "হোম পেজে বিক্রি, লাভ ও স্টকের সারাংশ",
    actions: ["view"],
    extras: [],
  },
  {
    key: "orders",
    label: "Orders",
    labelBn: "অর্ডার",
    hint: "Online and manual orders",
    hintBn: "অনলাইন ও ম্যানুয়াল অর্ডার",
    actions: ["view", "add", "edit", "delete"],
    extras: [
      { key: "change_status", label: "Change status", labelBn: "স্ট্যাটাস পরিবর্তন" },
      { key: "cancel", label: "Cancel order", labelBn: "অর্ডার বাতিল" },
      { key: "move_branch", label: "Move to another branch", labelBn: "অন্য ব্রাঞ্চে সরানো" },
    ],
  },
  {
    key: "pos",
    label: "Quick Sale",
    labelBn: "কুইক সেল",
    hint: "Walk-in sales at the counter",
    hintBn: "কাউন্টারে সরাসরি বিক্রি",
    actions: ["view", "add"],
    extras: [{ key: "discount", label: "Give discount", labelBn: "ডিসকাউন্ট দেওয়া" }],
  },
  {
    key: "register",
    label: "Cash Register",
    labelBn: "ক্যাশ রেজিস্টার",
    hint: "Opening cash and the end-of-day count",
    hintBn: "শুরুর ক্যাশ ও দিনশেষের হিসাব",
    actions: ["view", "add"],
    extras: [],
  },
  {
    key: "customers",
    label: "Customers",
    labelBn: "কাস্টমার",
    hint: "Customer list and the money they owe",
    hintBn: "কাস্টমার তালিকা ও তাদের বকেয়া",
    actions: ["view", "add", "edit", "delete"],
    extras: [{ key: "collect_payment", label: "Collect due payment", labelBn: "বকেয়া আদায়" }],
  },
  {
    key: "courier",
    label: "Courier shipments",
    labelBn: "কুরিয়ার শিপমেন্ট",
    hint: "Send orders to Pathao or Steadfast and track them",
    hintBn: "পাঠাও বা স্টেডফাস্টে অর্ডার পাঠানো ও ট্র্যাক করা",
    actions: ["view", "add"],
    extras: [],
  },
  {
    key: "products",
    label: "Products",
    labelBn: "পণ্য",
    hint: "Products, prices and bundles",
    hintBn: "পণ্য, দাম ও বান্ডেল",
    actions: ["view", "add", "edit", "delete"],
    // No "see cost price" tick yet: Create Order and Quick Sale read
    // tp_price in the browser to stamp each line's cost, so it can't be
    // hidden from a staff member without moving that to the server first.
    extras: [],
  },
  {
    key: "categories",
    label: "Categories",
    labelBn: "ক্যাটাগরি",
    hint: "Product categories",
    hintBn: "পণ্যের ক্যাটাগরি",
    actions: ["view", "add", "edit", "delete"],
    extras: [],
  },
  {
    key: "stock",
    label: "Stock",
    labelBn: "স্টক",
    hint: "Stock counts and adjustments",
    hintBn: "স্টকের পরিমাণ ও পরিবর্তন",
    actions: ["view", "edit"],
    extras: [],
  },
  {
    key: "transfers",
    label: "Stock transfers",
    labelBn: "স্টক ট্রান্সফার",
    hint: "Move stock between branches (only with branches turned on)",
    hintBn: "এক ব্রাঞ্চ থেকে আরেক ব্রাঞ্চে স্টক পাঠানো (ব্রাঞ্চ চালু থাকলে)",
    // add = create a draft, delete = cancel one
    actions: ["view", "add", "delete"],
    extras: [
      { key: "send", label: "Send", labelBn: "পাঠানো" },
      { key: "receive", label: "Receive", labelBn: "গ্রহণ" },
    ],
  },
  {
    key: "reviews",
    label: "Reviews",
    labelBn: "রিভিউ",
    hint: "Approve or hide customer reviews",
    hintBn: "কাস্টমার রিভিউ অনুমোদন বা লুকানো",
    actions: ["view", "edit"],
    extras: [],
  },
  {
    key: "reports",
    label: "Reports",
    labelBn: "রিপোর্ট",
    hint: "Sales report and profit & loss",
    hintBn: "বিক্রির রিপোর্ট ও লাভ-ক্ষতি",
    actions: ["view"],
    extras: [],
  },
  {
    key: "expenses",
    label: "Expenses",
    labelBn: "খরচ",
    hint: "Shop expenses and expense types",
    hintBn: "দোকানের খরচ ও খরচের ধরন",
    actions: ["view", "add", "edit", "delete"],
    extras: [],
  },
  {
    key: "cod",
    label: "COD Payouts",
    labelBn: "COD পেমেন্ট",
    hint: "Cash couriers hand over for delivered COD orders",
    hintBn: "ডেলিভারি হওয়া COD অর্ডারের টাকা কুরিয়ার থেকে নেওয়া",
    actions: ["view", "add", "delete"],
    extras: [],
  },
  {
    key: "vendors",
    label: "Vendors",
    labelBn: "ভেন্ডর",
    hint: "Resellers, stock sent to them and their payments",
    hintBn: "রিসেলার, তাদের পাঠানো স্টক ও পেমেন্ট",
    actions: ["view", "add", "edit", "delete"],
    extras: [],
  },
  {
    key: "storefront",
    label: "Online Store",
    labelBn: "অনলাইন স্টোর",
    hint: "Website slider, banners, announcement bar and design",
    hintBn: "ওয়েবসাইটের স্লাইডার, ব্যানার, ঘোষণা বার ও ডিজাইন",
    actions: ["view", "add", "edit", "delete"],
    extras: [],
  },
  {
    key: "coupons",
    label: "Coupons",
    labelBn: "কুপন",
    hint: "Discount codes for checkout",
    hintBn: "চেকআউটের ডিসকাউন্ট কোড",
    actions: ["view", "add", "edit", "delete"],
    extras: [],
  },
  {
    key: "activity",
    label: "Activity Log",
    labelBn: "অ্যাক্টিভিটি লগ",
    hint: "Who logged in and what they changed",
    hintBn: "কে লগইন করেছে ও কী পরিবর্তন করেছে",
    actions: ["view"],
    extras: [],
  },
] as const;

export interface PermissionSection {
  readonly key: string;
  readonly label: string;
  readonly labelBn: string;
  readonly areas: readonly string[];
}

/** How the role editor groups areas, in the order an owner thinks about them. */
export const PERMISSION_SECTIONS: readonly PermissionSection[] = [
  {
    key: "selling",
    label: "Selling",
    labelBn: "বিক্রি",
    areas: ["orders", "pos", "register", "customers", "courier"],
  },
  {
    key: "catalog",
    label: "Products & stock",
    labelBn: "পণ্য ও স্টক",
    areas: ["products", "categories", "stock", "transfers", "reviews"],
  },
  {
    key: "money",
    label: "Money & reports",
    labelBn: "টাকা ও রিপোর্ট",
    areas: ["dashboard", "reports", "expenses", "cod", "vendors"],
  },
  {
    key: "store",
    label: "Online store & marketing",
    labelBn: "অনলাইন স্টোর ও মার্কেটিং",
    areas: ["storefront", "coupons"],
  },
  {
    key: "team",
    label: "Team",
    labelBn: "টিম",
    areas: ["activity"],
  },
];

/** Every permission string in one area, e.g. all of "orders.*". */
export function areaPermissions(area: PermissionArea): string[] {
  return [
    ...area.actions.map((action) => `${area.key}.${action}`),
    ...area.extras.map((extra) => `${area.key}.${extra.key}`),
  ];
}

export type AreaAccess = "none" | "view" | "full" | "custom";

/** Summarises an area's ticks as one access level for the role editor. */
export function areaAccess(area: PermissionArea, permissions: ReadonlySet<string>): AreaAccess {
  const all = areaPermissions(area);
  const held = all.filter((p) => permissions.has(p));
  if (held.length === 0) return "none";
  if (held.length === all.length) return "full";
  if (held.length === 1 && held[0] === `${area.key}.view`) return "view";
  return "custom";
}

/**
 * Which role limits mean anything for a set of permissions — the editor hides
 * the rest, and drops them on save so a stale limit can't linger unseen.
 */
export function relevantLimits(permissions: ReadonlySet<string>): Set<keyof RoleLimits> {
  const has = (p: string) => permissions.has(p);
  const relevant = new Set<keyof RoleLimits>();
  if (has("pos.discount") || has("orders.add") || has("orders.edit")) {
    relevant.add("max_discount_amount");
    relevant.add("max_discount_percent");
  }
  if (has("orders.cancel")) relevant.add("cancel_statuses");
  if (has("orders.edit")) relevant.add("edit_statuses");
  if (Array.from(permissions).some((p) => p.endsWith(".delete"))) relevant.add("delete_within_hours");
  if (has("stock.edit")) relevant.add("max_stock_adjustment");
  if (has("expenses.add") || has("expenses.edit")) relevant.add("max_expense_amount");
  return relevant;
}

/** Every valid permission string, e.g. "orders.view", "pos.discount". */
export const ALL_PERMISSIONS: readonly string[] = PERMISSION_AREAS.flatMap((area) => [
  ...area.actions.map((action) => `${area.key}.${action}`),
  ...area.extras.map((extra) => `${area.key}.${extra.key}`),
]);

const ALL_PERMISSION_SET = new Set(ALL_PERMISSIONS);

/** Drops anything that isn't a known permission (e.g. from a tampered request). */
export function sanitizePermissions(permissions: readonly string[]): string[] {
  return Array.from(new Set(permissions.filter((p) => ALL_PERMISSION_SET.has(p))));
}

/* ----------------------------------------------------------------------- */
/* Role limits                                                              */
/* ----------------------------------------------------------------------- */

/**
 * Per-role limits, stored in store_roles.limits. Every key is optional and
 * a missing key means "no limit". Enforced on the server in
 * src/lib/permissions/server.ts — hiding a button is never the only check.
 */
export interface RoleLimits {
  /** Max discount per order, in taka. */
  max_discount_amount?: number;
  /** Max discount per order, as a percent of the subtotal. */
  max_discount_percent?: number;
  /** Order statuses in which this role may cancel. */
  cancel_statuses?: string[];
  /** Order statuses in which this role may edit. */
  edit_statuses?: string[];
  /** Records older than this many hours can't be deleted by this role. */
  delete_within_hours?: number;
  /** Max units per single stock adjustment (either direction). */
  max_stock_adjustment?: number;
  /** Max amount per expense entry, in taka. */
  max_expense_amount?: number;
}

export const ORDER_STATUSES_FOR_LIMITS = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

function toPositiveNumber(value: unknown): number | undefined {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : undefined;
}

function toStatusList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowed = new Set<string>(ORDER_STATUSES_FOR_LIMITS);
  return value.filter((v): v is string => typeof v === "string" && allowed.has(v));
}

/** Normalises whatever is stored or submitted into a clean RoleLimits. */
export function sanitizeLimits(raw: unknown): RoleLimits {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const limits: RoleLimits = {
    max_discount_amount: toPositiveNumber(source.max_discount_amount),
    max_discount_percent: toPositiveNumber(source.max_discount_percent),
    cancel_statuses: toStatusList(source.cancel_statuses),
    edit_statuses: toStatusList(source.edit_statuses),
    delete_within_hours: toPositiveNumber(source.delete_within_hours),
    max_stock_adjustment: toPositiveNumber(source.max_stock_adjustment),
    max_expense_amount: toPositiveNumber(source.max_expense_amount),
  };
  return Object.fromEntries(
    Object.entries(limits).filter(([, v]) => v !== undefined),
  ) as RoleLimits;
}

/* ----------------------------------------------------------------------- */
/* Ready-made roles                                                         */
/* ----------------------------------------------------------------------- */

export interface SystemRoleTemplate {
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly string[];
  readonly limits: RoleLimits;
}

/**
 * Seeded into every store the first time its owner opens the Staff page.
 * The owner can change any tick afterwards; these are only starting points.
 */
export const SYSTEM_ROLE_TEMPLATES: readonly SystemRoleTemplate[] = [
  {
    name: "Branch Manager",
    description: "Runs the shop day to day. Everything except store settings, staff and roles.",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "activity.view"),
    limits: {},
  },
  {
    name: "Cashier",
    description: "Takes walk-in sales, collects dues and runs the cash register.",
    permissions: [
      "orders.view",
      "orders.add",
      "orders.change_status",
      "pos.view",
      "pos.add",
      "pos.discount",
      "register.view",
      "register.add",
      "customers.view",
      "customers.add",
      "customers.collect_payment",
      "products.view",
      "categories.view",
      "stock.view",
      "coupons.view",
    ],
    limits: { max_discount_amount: 200, max_discount_percent: 10 },
  },
  {
    name: "Stock Keeper",
    description: "Keeps products and stock up to date.",
    permissions: [
      "products.view",
      "categories.view",
      "stock.view",
      "stock.edit",
      "transfers.view",
      "transfers.add",
      "transfers.send",
      "transfers.receive",
    ],
    limits: { max_stock_adjustment: 50 },
  },
  {
    name: "Order Handler",
    description: "Processes online orders and ships them. No deleting and no money.",
    permissions: [
      "orders.view",
      "orders.add",
      "orders.edit",
      "orders.change_status",
      "customers.view",
      "products.view",
      "stock.view",
      "courier.view",
      "courier.add",
    ],
    limits: { edit_statuses: ["pending", "confirmed"] },
  },
];
