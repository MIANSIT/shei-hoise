import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import { logActivity } from "@/lib/permissions/server";
import { todayInDhaka } from "./membershipTypes";
import { sendWelcomeForMembership } from "./membershipWelcome";
import { membershipFeatureEnabled } from "./membershipFeature";

// Server-only: gives a customer a membership when their total shopping reaches
// the spend target of a level. No permission check here: it runs after an order
// was saved, or from the permission-checked "check customers now" action.

export interface AutoPlan {
  id: string;
  name: string;
  minSpend: number;
  prefix: string;
}

interface SpendRow {
  subtotal: number | string | null;
  discount_amount: number | string | null;
  additional_charges: number | string | null;
  status: string | null;
}

/** Cancelled and returned orders are not shopping the customer kept. */
const NOT_COUNTED = new Set(["cancelled", "returned"]);

const NUMBER_RETRIES = 3;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** What one order counts as shopping: goods after discount, plus extra charges (not delivery or tax). */
export function orderSpend(row: SpendRow): number {
  if (row.status && NOT_COUNTED.has(row.status)) return 0;
  return Number(row.subtotal ?? 0) - Number(row.discount_amount ?? 0) + Number(row.additional_charges ?? 0);
}

/**
 * The store's levels that are given automatically: active, with a spend target and a number prefix.
 * Empty (never an error) on a database that has not got those columns yet.
 */
export async function loadAutoPlans(storeId: string): Promise<AutoPlan[]> {
  const { data, error } = await supabaseAdmin.from("membership_plans").select("*").eq("store_id", storeId).eq("is_active", true);
  if (error) return [];
  return ((data ?? []) as { id: string; name: string; min_spend?: number | string | null; number_prefix?: string | null }[])
    .filter((p) => p.min_spend != null && Number(p.min_spend) > 0 && !!p.number_prefix?.trim())
    .map((p) => ({ id: p.id, name: p.name, minSpend: Number(p.min_spend), prefix: (p.number_prefix as string).trim() }));
}

async function customerSpend(storeId: string, customerId: string): Promise<number> {
  const rows = await fetchAllPaged<SpendRow>((from, to) =>
    supabaseAdmin
      .from("orders")
      .select("subtotal, discount_amount, additional_charges, status")
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .order("id")
      .range(from, to) as unknown as PromiseLike<{ data: SpendRow[] | null; error: { message: string } | null }>,
  );
  return rows.reduce((sum, row) => sum + orderSpend(row), 0);
}

/** The next free number under a prefix: PAW-126 → PAW-126-001, then -002, and so on. */
async function nextNumber(storeId: string, prefix: string): Promise<string> {
  const like = `${prefix.replace(/[\\%_]/g, (c) => `\\${c}`)}-%`;
  const { data } = await supabaseAdmin
    .from("customer_memberships")
    .select("membership_number")
    .eq("store_id", storeId)
    .ilike("membership_number", like)
    .limit(1000);
  const pattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`, "i");
  let highest = 0;
  for (const row of (data ?? []) as { membership_number: string }[]) {
    const match = pattern.exec(row.membership_number);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
}

/**
 * Gives the customer the highest automatic level their total shopping has reached.
 * - Once earned a membership is kept (the total is lifetime, nothing resets monthly).
 * - A membership an admin gave by hand is never changed.
 * - One that was earned is moved up when a higher level is reached, never down.
 * Failures are logged and swallowed: the order that triggered this must never fail because of it.
 * @returns true when a membership was given or moved up
 */
export async function evaluateAutoMembership(
  storeId: string,
  customerId: string | null | undefined,
  options: { plans?: AutoPlan[]; spend?: number } = {},
): Promise<boolean> {
  try {
    if (!customerId) return false;
    // No memberships in the plan: nothing to give, and no extra work on the order.
    if (!(await membershipFeatureEnabled(storeId))) return false;
    const plans = options.plans ?? (await loadAutoPlans(storeId));
    if (plans.length === 0) return false;

    const { data: currentData } = await supabaseAdmin
      .from("customer_memberships")
      .select("*")
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .maybeSingle();
    const current = currentData as { id: string; plan_id: string; source?: string | null; membership_number: string } | null;
    if (current && (current.source ?? "manual") !== "auto") return false;

    const spend = options.spend ?? (await customerSpend(storeId, customerId));
    const earned = [...plans].sort((a, b) => b.minSpend - a.minSpend).find((p) => spend >= p.minSpend);
    if (!earned) return false;

    if (current) {
      if (current.plan_id === earned.id) return false;
      const currentTarget = plans.find((p) => p.id === current.plan_id)?.minSpend ?? 0;
      if (earned.minSpend <= currentTarget) return false;
      const { error } = await supabaseAdmin
        .from("customer_memberships")
        .update({ plan_id: earned.id, updated_at: new Date().toISOString() })
        .eq("id", current.id)
        .eq("store_id", storeId);
      if (error) throw new Error(error.message);
      await logActivity(null, {
        storeId,
        action: "memberships.edit",
        entityType: "customer_membership",
        entityId: current.id,
        summary: `Membership ${current.membership_number} moved up to ${earned.name} (total shopping reached ${earned.minSpend})`,
      });
      return true;
    }

    for (let attempt = 0; attempt < NUMBER_RETRIES; attempt++) {
      const number = await nextNumber(storeId, earned.prefix);
      const { data, error } = await supabaseAdmin
        .from("customer_memberships")
        .insert({
          store_id: storeId,
          customer_id: customerId,
          plan_id: earned.id,
          membership_number: number,
          starts_on: todayInDhaka(),
          ends_on: null,
          source: "auto",
        })
        .select("id")
        .single();
      if (!error) {
        await logActivity(null, {
          storeId,
          action: "memberships.add",
          entityType: "customer_membership",
          entityId: data.id,
          summary: `Membership ${number} (${earned.name}) given automatically: total shopping reached ${earned.minSpend}`,
          details: { customer_id: customerId, plan_id: earned.id, spend },
        });
        // Tell the customer, when the store sends welcome emails and we have an address for them.
        // Never lets a failed email undo the membership.
        await sendWelcomeForMembership(storeId, data.id);
        return true;
      }
      // Someone else took that number a moment ago: take the next one. Any other failure ends the attempt.
      if (error.code !== "23505" || !error.message.includes("customer_memberships_number_uniq")) {
        if (error.code === "23505") return false; // the customer got a membership in the meantime
        throw new Error(error.message);
      }
    }
    return false;
  } catch (error) {
    console.error("evaluateAutoMembership failed:", error);
    return false;
  }
}

/**
 * Works through every customer of the store who has shopped enough for the lowest
 * automatic level, and gives or moves up their membership.
 * @returns how many customers got a membership or a higher level
 */
export async function evaluateAllCustomers(storeId: string): Promise<number> {
  if (!(await membershipFeatureEnabled(storeId))) return 0;
  const plans = await loadAutoPlans(storeId);
  if (plans.length === 0) return 0;
  const lowest = Math.min(...plans.map((p) => p.minSpend));

  const rows = await fetchAllPaged<SpendRow & { customer_id: string | null }>((from, to) =>
    supabaseAdmin
      .from("orders")
      .select("customer_id, subtotal, discount_amount, additional_charges, status")
      .eq("store_id", storeId)
      .not("customer_id", "is", null)
      .order("id")
      .range(from, to) as unknown as PromiseLike<{
      data: (SpendRow & { customer_id: string | null })[] | null;
      error: { message: string } | null;
    }>,
  );

  const spendByCustomer = new Map<string, number>();
  for (const row of rows) {
    if (!row.customer_id) continue;
    spendByCustomer.set(row.customer_id, (spendByCustomer.get(row.customer_id) ?? 0) + orderSpend(row));
  }

  let given = 0;
  for (const [customerId, spend] of spendByCustomer) {
    if (spend < lowest) continue;
    if (await evaluateAutoMembership(storeId, customerId, { plans, spend })) given++;
  }
  return given;
}
