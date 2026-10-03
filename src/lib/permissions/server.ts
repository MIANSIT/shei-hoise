import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { hasFeature } from "@/lib/utils/planFeatures";
import { PERMISSION_AREAS, sanitizeLimits, type RoleLimits } from "./catalog";

/**
 * Server-only. Who is calling a dashboard server action, and what they may do.
 *
 * Every server action that writes through supabaseAdmin skips RLS, so this is
 * the real protection for staff — the sidebar and hidden buttons are only
 * there for a clean UI. Mirrors public.has_store_permission() in SQL.
 */

export const STAFF_ACCOUNTS_FEATURE = "staff_accounts";
export const MAX_STAFF_LIMIT = "max_staff";

interface ActorBase {
  userId: string;
  storeId: string;
  name: string;
}

export interface OwnerActor extends ActorBase {
  kind: "owner";
}

export interface StaffActor extends ActorBase {
  kind: "staff";
  staffId: string;
  username: string;
  roleId: string;
  roleName: string;
  permissions: ReadonlySet<string>;
  limits: RoleLimits;
  allBranches: boolean;
  branchIds: string[];
  mustChangePassword: boolean;
}

export type Actor = OwnerActor | StaffActor;

export type ActorResult = { ok: true; actor: Actor } | { ok: false; error: string };

interface StaffRow {
  id: string;
  username: string;
  display_name: string;
  is_active: boolean;
  must_change_password: boolean;
  all_branches: boolean;
  branch_ids: string[] | null;
  role_id: string;
  store_roles: { name: string; permissions: string[] | null; limits: unknown } | null;
}

/**
 * Resolves the signed-in dashboard user from their session cookie. Cached per
 * request, so calling it from several helpers in one action costs one lookup.
 */
export const getActor = cache(async (): Promise<ActorResult> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again." };

  const { data: dbUser } = await supabaseAdmin
    .from("users")
    .select("id, store_id, user_type, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!dbUser?.store_id) return { ok: false, error: "No store associated with this account" };

  const name = [dbUser.first_name, dbUser.last_name].filter(Boolean).join(" ").trim();

  if (dbUser.user_type === "store_owner") {
    return { ok: true, actor: { kind: "owner", userId: dbUser.id, storeId: dbUser.store_id, name: name || "Owner" } };
  }

  if (dbUser.user_type !== "store_staff") {
    return { ok: false, error: "Unauthorized" };
  }

  const { data: staff } = await supabaseAdmin
    .from("store_staff")
    .select(
      "id, username, display_name, is_active, must_change_password, all_branches, branch_ids, role_id, store_roles (name, permissions, limits)",
    )
    .eq("user_id", dbUser.id)
    .eq("store_id", dbUser.store_id)
    .maybeSingle();

  const row = staff as unknown as StaffRow | null;
  if (!row || !row.is_active) {
    return { ok: false, error: "Your staff account has been deactivated. Please contact the store owner." };
  }

  const subscription = await getStoreFeatureSubscription(dbUser.store_id);
  if (!hasFeature(subscription, STAFF_ACCOUNTS_FEATURE)) {
    return { ok: false, error: "Staff logins are not available on this store's current plan." };
  }

  return {
    ok: true,
    actor: {
      kind: "staff",
      userId: dbUser.id,
      storeId: dbUser.store_id,
      name: row.display_name || name || row.username,
      staffId: row.id,
      username: row.username,
      roleId: row.role_id,
      roleName: row.store_roles?.name ?? "Staff",
      permissions: new Set(row.store_roles?.permissions ?? []),
      limits: sanitizeLimits(row.store_roles?.limits),
      allBranches: row.all_branches,
      branchIds: row.branch_ids ?? [],
      mustChangePassword: row.must_change_password,
    },
  };
});

/** True for the owner always; for staff only when their role grants it. */
export function can(actor: Actor, permission: string): boolean {
  return actor.kind === "owner" || actor.permissions.has(permission);
}

/** "orders.delete" -> "Delete · Orders", for messages shown to staff. */
export function describePermission(permission: string): string {
  const [areaKey, actionKey] = permission.split(".");
  const area = PERMISSION_AREAS.find((a) => a.key === areaKey);
  if (!area) return permission;
  const extra = area.extras.find((e) => e.key === actionKey);
  const action = extra ? extra.label : actionKey.charAt(0).toUpperCase() + actionKey.slice(1);
  return `${action} · ${area.label}`;
}

export function permissionDeniedMessage(permission: string): string {
  return `Your role doesn't allow this (${describePermission(permission)}). Ask the store owner for access.`;
}

/**
 * The one check every dashboard write action calls first.
 *
 * - Resolves the caller from their session (never from a client argument).
 * - When `storeId` is passed (legacy actions that take it from the client),
 *   it must match the caller's own store.
 * - Owner always passes; staff need `permission` in their role.
 */
export async function requirePermission(
  permission: string,
  options: { storeId?: string | null } = {},
): Promise<ActorResult> {
  const result = await getActor();
  if (!result.ok) return result;

  const { actor } = result;
  if (options.storeId && options.storeId !== actor.storeId) {
    return { ok: false, error: "Unauthorized" };
  }
  if (!can(actor, permission)) {
    return { ok: false, error: permissionDeniedMessage(permission) };
  }
  return result;
}

export type AuthorizedStoreResult =
  | { ok: true; storeId: string; actor: Actor }
  | { ok: false; error: string };

/**
 * Drop-in replacement for getAuthenticatedStoreId() in a write action: same
 * { ok, storeId } | { ok: false, error } shape, plus the permission check.
 */
export async function getAuthorizedStoreId(permission: string): Promise<AuthorizedStoreResult> {
  const result = await requirePermission(permission);
  if (!result.ok) return result;
  return { ok: true, storeId: result.actor.storeId, actor: result.actor };
}

/**
 * For legacy actions that take storeId from the client: the caller must
 * belong to that store and hold `permission`.
 */
export async function authorizeForStore(
  storeId: string | null | undefined,
  permission: string,
): Promise<AuthorizedStoreResult> {
  if (!storeId) return { ok: false, error: "Unauthorized" };
  const result = await requirePermission(permission, { storeId });
  if (!result.ok) return result;
  return { ok: true, storeId: result.actor.storeId, actor: result.actor };
}

/**
 * For actions reachable from more than one screen (e.g. a payment recorded
 * from Customer Dues, Create Order or Quick Sale): any one of `permissions`
 * is enough.
 */
export async function authorizeForStoreAny(
  storeId: string | null | undefined,
  permissions: readonly string[],
): Promise<AuthorizedStoreResult> {
  if (!storeId) return { ok: false, error: "Unauthorized" };
  const result = await getActor();
  if (!result.ok) return result;
  if (storeId !== result.actor.storeId) return { ok: false, error: "Unauthorized" };
  if (!permissions.some((p) => can(result.actor, p))) {
    return { ok: false, error: permissionDeniedMessage(permissions[0]) };
  }
  return { ok: true, storeId: result.actor.storeId, actor: result.actor };
}

/**
 * For actions that only get a product id: the product must belong to the
 * caller's store, and any one of `permissions` must be held.
 */
export async function authorizeProduct(
  productId: string | null | undefined,
  permissions: readonly string[],
): Promise<AuthorizedStoreResult> {
  const result = await getActor();
  if (!result.ok) return result;
  if (!productId) return { ok: false, error: "Product not found" };
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("store_id")
    .eq("id", productId)
    .maybeSingle();
  if (!product || product.store_id !== result.actor.storeId) {
    return { ok: false, error: "Product not found" };
  }
  if (!permissions.some((p) => can(result.actor, p))) {
    return { ok: false, error: permissionDeniedMessage(permissions[0]) };
  }
  return { ok: true, storeId: result.actor.storeId, actor: result.actor };
}

/**
 * For actions shared with the public storefront (e.g. creating a customer at
 * checkout): no check for customers or anonymous callers, but a signed-in
 * staff member needs `permission`. Returns an error message, or null.
 */
export async function staffPermissionError(
  permissions: string | readonly string[],
): Promise<string | null> {
  const list = typeof permissions === "string" ? [permissions] : permissions;
  const result = await getActor();
  if (!result.ok || result.actor.kind !== "staff") return null;
  const { actor } = result;
  return list.some((p) => can(actor, p)) ? null : permissionDeniedMessage(list[0]);
}

/** Drop-in for getAuthenticatedStoreId() in owner-only actions (settings, courier accounts). */
export async function getOwnerStoreId(): Promise<AuthorizedStoreResult> {
  const result = await requireOwner();
  if (!result.ok) return result;
  return { ok: true, storeId: result.actor.storeId, actor: result.actor };
}

/** Owner-only actions: settings, courier accounts, staff and roles. */
export async function requireOwner(options: { storeId?: string | null } = {}): Promise<
  { ok: true; actor: OwnerActor } | { ok: false; error: string }
> {
  const result = await getActor();
  if (!result.ok) return result;
  if (options.storeId && options.storeId !== result.actor.storeId) {
    return { ok: false, error: "Unauthorized" };
  }
  if (result.actor.kind !== "owner") {
    return { ok: false, error: "Only the store owner can do this." };
  }
  return { ok: true, actor: result.actor };
}

/* ----------------------------------------------------------------------- */
/* Role limits — each returns an error message, or null when allowed.       */
/* ----------------------------------------------------------------------- */

function staffLimits(actor: Actor): RoleLimits | null {
  return actor.kind === "staff" ? actor.limits : null;
}

export function checkDeleteWindow(actor: Actor, createdAt: string | null | undefined): string | null {
  const hours = staffLimits(actor)?.delete_within_hours;
  if (hours === undefined || !createdAt) return null;
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  return ageHours > hours
    ? `Your role can only delete records created in the last ${hours} hour${hours === 1 ? "" : "s"}.`
    : null;
}

export function checkOrderStatusLimit(
  actor: Actor,
  kind: "cancel" | "edit",
  currentStatus: string | null | undefined,
): string | null {
  const limits = staffLimits(actor);
  const allowed = kind === "cancel" ? limits?.cancel_statuses : limits?.edit_statuses;
  if (!allowed || !currentStatus) return null;
  return allowed.includes(currentStatus)
    ? null
    : `Your role can't ${kind} an order that is ${currentStatus}.`;
}

export function checkDiscountLimit(actor: Actor, discount: number, subtotal: number): string | null {
  const limits = staffLimits(actor);
  if (!limits || !discount || discount <= 0) return null;
  if (limits.max_discount_amount !== undefined && discount > limits.max_discount_amount) {
    return `Your role allows up to ৳${limits.max_discount_amount} discount per order.`;
  }
  if (limits.max_discount_percent !== undefined && subtotal > 0) {
    const percent = (discount / subtotal) * 100;
    if (percent > limits.max_discount_percent + 1e-9) {
      return `Your role allows up to ${limits.max_discount_percent}% discount per order.`;
    }
  }
  return null;
}

export interface OrderChange {
  /** Status the order has right now. */
  fromStatus: string | null | undefined;
  /** New status, when the change sets one. */
  toStatus?: string | null;
  /** payment_status is being set (marking paid/refunded counts as a status change). */
  paymentStatusChanged?: boolean;
  /** The payment_status being set, when paymentStatusChanged. */
  toPaymentStatus?: string | null;
  /** Anything else on the order: items, fees, courier, notes, address... */
  otherFieldsChanged?: boolean;
  /** New discount and the subtotal it applies to, when the discount changes. */
  discount?: number;
  subtotal?: number;
}

/**
 * The permission + limit rules for changing an existing order. Returns an
 * error message, or null when allowed. The owner always passes.
 */
export function checkOrderChange(actor: Actor, change: OrderChange): string | null {
  if (actor.kind === "owner") return null;

  const statusChanging =
    !!change.toStatus && change.toStatus !== change.fromStatus;

  if (statusChanging && change.toStatus === "cancelled") {
    if (!can(actor, "orders.cancel")) return permissionDeniedMessage("orders.cancel");
    const limited = checkOrderStatusLimit(actor, "cancel", change.fromStatus);
    if (limited) return limited;
  } else if (statusChanging) {
    if (!can(actor, "orders.change_status")) return permissionDeniedMessage("orders.change_status");
  }

  // Marking an order paid is collecting its payment, so either permission covers it.
  if (change.paymentStatusChanged && !can(actor, "orders.change_status")) {
    const collecting = change.toPaymentStatus === "paid" && can(actor, "customers.collect_payment");
    if (!collecting) return permissionDeniedMessage("orders.change_status");
  }

  if (change.otherFieldsChanged) {
    if (!can(actor, "orders.edit")) return permissionDeniedMessage("orders.edit");
    const limited = checkOrderStatusLimit(actor, "edit", change.fromStatus);
    if (limited) return limited;
  }

  if (change.discount !== undefined) {
    return checkDiscountLimit(actor, change.discount, change.subtotal ?? 0);
  }
  return null;
}

export function checkStockAdjustmentLimit(actor: Actor, delta: number): string | null {
  const max = staffLimits(actor)?.max_stock_adjustment;
  if (max === undefined) return null;
  return Math.abs(delta) > max
    ? `Your role can change stock by at most ${max} unit${max === 1 ? "" : "s"} at a time.`
    : null;
}

export function checkExpenseLimit(actor: Actor, amount: number): string | null {
  const max = staffLimits(actor)?.max_expense_amount;
  if (max === undefined) return null;
  return amount > max ? `Your role can enter expenses up to ৳${max}. Ask the owner to enter this one.` : null;
}

/* ----------------------------------------------------------------------- */
/* Activity log                                                             */
/* ----------------------------------------------------------------------- */

export interface ActivityEntry {
  action: string;
  entityType?: string;
  entityId?: string | null;
  summary?: string;
  details?: Record<string, unknown> | null;
}

async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    return {
      ip: forwarded ? forwarded.split(",")[0].trim() : h.get("x-real-ip"),
      userAgent: h.get("user-agent"),
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/**
 * Appends one row to store_activity_log. Never throws — a failed audit write
 * must not undo or block the action it describes.
 */
export async function logActivity(
  actor: Actor | null,
  entry: ActivityEntry & {
    storeId?: string;
    userId?: string | null;
    actorName?: string | null;
    actorRole?: string | null;
  },
): Promise<void> {
  try {
    const storeId = actor?.storeId ?? entry.storeId;
    if (!storeId) return;
    const meta = await requestMeta();
    await supabaseAdmin.from("store_activity_log").insert({
      store_id: storeId,
      user_id: actor?.userId ?? entry.userId ?? null,
      actor_name: actor?.name ?? entry.actorName ?? null,
      actor_role: actor ? (actor.kind === "owner" ? "Owner" : actor.roleName) : entry.actorRole ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      summary: entry.summary ?? null,
      details: entry.details ?? null,
      ip: meta.ip,
      user_agent: meta.userAgent,
    });
  } catch (err) {
    console.error("logActivity failed:", err);
  }
}

/** Writes the activity-log row for an order change described by checkOrderChange's input. */
export async function logOrderChange(
  actor: Actor,
  order: { id: string; order_number?: string | null },
  change: OrderChange & { fields?: string[] },
): Promise<void> {
  const statusChanging = !!change.toStatus && change.toStatus !== change.fromStatus;
  const label = order.order_number ? `#${order.order_number}` : "Order";
  const parts: string[] = [];
  if (statusChanging) parts.push(`${change.fromStatus} → ${change.toStatus}`);
  if (change.paymentStatusChanged && change.toPaymentStatus) parts.push(`payment ${change.toPaymentStatus}`);
  if (change.otherFieldsChanged && change.fields?.length) parts.push(`edited ${change.fields.join(", ")}`);

  await logActivity(actor, {
    action:
      statusChanging && change.toStatus === "cancelled"
        ? "orders.cancel"
        : statusChanging || change.paymentStatusChanged
          ? "orders.change_status"
          : "orders.edit",
    entityType: "order",
    entityId: order.id,
    summary: `${label}: ${parts.join(" · ") || "edited"}`,
  });
}

/**
 * Logs a delete with a full copy of what was removed, so the owner can always
 * see exactly what went, even after it's gone from every list.
 */
export async function logDeleted(
  actor: Actor,
  area: string,
  entityType: string,
  record: Record<string, unknown> & { id?: unknown },
  summary: string,
): Promise<void> {
  await logActivity(actor, {
    action: `${area}.delete`,
    entityType,
    entityId: record.id != null ? String(record.id) : null,
    summary,
    details: { deleted_record: record },
  });
}

/** Logs only when the caller is resolvable; for actions that don't otherwise need the actor. */
export async function logActivityForCurrentUser(entry: ActivityEntry): Promise<void> {
  const result = await getActor();
  if (result.ok) await logActivity(result.actor, entry);
}
