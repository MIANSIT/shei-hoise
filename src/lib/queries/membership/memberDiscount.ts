"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStore } from "@/lib/permissions/server";
import { computeMemberDiscount } from "./memberDiscountCore";
import {
  membershipStatus,
  todayInDhaka,
  type MemberDiscountLine,
  type CustomerMembershipSummary,
  type MemberDiscountResult,
  type MemberLookup,
} from "./membershipTypes";

const NO_DISCOUNT: MemberDiscountResult = { membership: null, discount: 0, lines: [] };

/** Whoever may add a Quick Sale or an order may see what a member's discount would be. */
async function canSell(storeId: string): Promise<boolean> {
  const pos = await authorizeForStore(storeId, "pos.add");
  if (pos.ok) return true;
  const orders = await authorizeForStore(storeId, "orders.add");
  return orders.ok;
}

/**
 * What a customer's membership would take off these lines, for showing the
 * member discount while an order is being put together. The order itself checks
 * it again when it is saved.
 * @returns the discount, or none when the customer has no valid membership or the caller may not sell
 */
export async function previewMemberDiscount(
  storeId: string,
  customerId: string | null,
  lines: MemberDiscountLine[],
): Promise<MemberDiscountResult> {
  try {
    if (!(await canSell(storeId))) return NO_DISCOUNT;
    return await computeMemberDiscount(storeId, customerId, lines);
  } catch (error) {
    console.error("previewMemberDiscount failed:", error);
    return NO_DISCOUNT;
  }
}

/**
 * The membership number of a customer, for printing on their receipt or invoice.
 * @returns the number, or null when the customer is not a member or the caller may not see orders
 */
export async function getCustomerMemberNumber(storeId: string, customerId: string | null | undefined): Promise<string | null> {
  try {
    if (!customerId) return null;
    const viewer = await authorizeForStore(storeId, "orders.view");
    if (!viewer.ok && !(await canSell(storeId))) return null;

    const { data } = await supabaseAdmin
      .from("customer_memberships")
      .select("membership_number")
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .maybeSingle();
    return (data as { membership_number: string } | null)?.membership_number ?? null;
  } catch (error) {
    console.error("getCustomerMemberNumber failed:", error);
    return null;
  }
}

/**
 * A customer's membership (number, level, active or expired), to show beside their details on an order.
 * @returns the membership, or null when the customer is not a member or the caller may not see orders
 */
export async function getCustomerMembership(
  storeId: string,
  customerId: string | null | undefined,
): Promise<CustomerMembershipSummary | null> {
  try {
    if (!customerId) return null;
    const viewer = await authorizeForStore(storeId, "orders.view");
    if (!viewer.ok && !(await canSell(storeId))) return null;

    const { data } = await supabaseAdmin
      .from("customer_memberships")
      .select("membership_number, ends_on, membership_plans(name)")
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .maybeSingle();
    if (!data) return null;
    const row = data as unknown as {
      membership_number: string;
      ends_on: string | null;
      membership_plans: { name: string } | null;
    };
    return {
      number: row.membership_number,
      planName: row.membership_plans?.name ?? "—",
      status: membershipStatus(row.ends_on, todayInDhaka()),
    };
  } catch (error) {
    console.error("getCustomerMembership failed:", error);
    return null;
  }
}

/**
 * Membership numbers of several customers at once (customer id → number), for a batch of invoices.
 * Customers who are not members are left out.
 * @returns the map, or an empty one when the caller may not see orders
 */
export async function getMemberNumbersForCustomers(
  storeId: string,
  customerIds: readonly string[],
): Promise<Record<string, string>> {
  try {
    const ids = Array.from(new Set(customerIds.filter(Boolean)));
    if (ids.length === 0) return {};
    const viewer = await authorizeForStore(storeId, "orders.view");
    if (!viewer.ok && !(await canSell(storeId))) return {};

    const { data } = await supabaseAdmin
      .from("customer_memberships")
      .select("customer_id, membership_number")
      .eq("store_id", storeId)
      .in("customer_id", ids);
    const map: Record<string, string> = {};
    for (const row of (data ?? []) as { customer_id: string; membership_number: string }[]) {
      map[row.customer_id] = row.membership_number;
    }
    return map;
  } catch (error) {
    console.error("getMemberNumbersForCustomers failed:", error);
    return {};
  }
}

/**
 * Finds a member by their membership number (typed as printed on the card, any capitals).
 * @returns the member, or null when no such number exists in this store
 */
export async function findMemberByNumber(storeId: string, number: string): Promise<MemberLookup | null> {
  try {
    if (!(await canSell(storeId))) return null;
    const text = number.trim();
    if (!text) return null;

    // ilike treats % and _ as wildcards; the number must match exactly (ignoring case).
    const exact = text.replace(/[\\%_]/g, (c) => `\\${c}`);
    const { data } = await supabaseAdmin
      .from("customer_memberships")
      .select("customer_id, membership_number, ends_on, store_customers(name, phone), membership_plans(name)")
      .eq("store_id", storeId)
      .ilike("membership_number", exact)
      .limit(1)
      .maybeSingle();
    if (!data) return null;

    const row = data as unknown as {
      customer_id: string;
      membership_number: string;
      ends_on: string | null;
      store_customers: { name: string | null; phone: string | null } | null;
      membership_plans: { name: string } | null;
    };
    return {
      customerId: row.customer_id,
      customerName: row.store_customers?.name?.trim() || "—",
      customerPhone: row.store_customers?.phone ?? null,
      membershipNumber: row.membership_number,
      planName: row.membership_plans?.name ?? "—",
      status: membershipStatus(row.ends_on, todayInDhaka()),
    };
  } catch (error) {
    console.error("findMemberByNumber failed:", error);
    return null;
  }
}
