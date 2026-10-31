import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import { todayInDhaka, type MemberDiscountLine, type MemberDiscountResult } from "./membershipTypes";
import { membershipFeatureEnabled } from "./membershipFeature";

// Server-only: no permission check here. Callers are either server code that
// already authorised the order (createOrder, createCustomerOrder) or the
// permission-checked actions in memberDiscount.ts.

const NO_DISCOUNT: MemberDiscountResult = { membership: null, discount: 0, lines: [] };

const round2 = (value: number) => Math.round(value * 100) / 100;

interface MembershipRow {
  id: string;
  plan_id: string;
  membership_number: string;
  starts_on: string;
  ends_on: string | null;
  membership_plans: { name: string } | null;
}

interface BenefitRow {
  discount_percent: number | string;
  category_ids: string[] | null;
}

/**
 * What the customer's membership takes off these order lines, worked out from
 * the store's own data. A membership counts from its start date to its end date
 * (both days included). Each line gets the highest percent among the discount
 * rows that cover its product's category (a row covers its categories and all
 * their sub-categories; a row with no categories covers every product). Rows
 * never stack on one line. The order's discount is a whole number of taka,
 * rounded down.
 * @returns the membership and the discount, or no discount when the customer has none valid today
 */
export async function computeMemberDiscount(
  storeId: string,
  customerId: string | null | undefined,
  lines: readonly MemberDiscountLine[],
): Promise<MemberDiscountResult> {
  if (!customerId) return NO_DISCOUNT;
  // A store whose plan has no memberships gives no member discount, whatever is saved.
  if (!(await membershipFeatureEnabled(storeId))) return NO_DISCOUNT;

  const { data: membershipData } = await supabaseAdmin
    .from("customer_memberships")
    .select("id, plan_id, membership_number, starts_on, ends_on, membership_plans(name)")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .maybeSingle();
  const membership = membershipData as unknown as MembershipRow | null;
  if (!membership) return NO_DISCOUNT;

  const today = todayInDhaka();
  if (membership.starts_on > today) return NO_DISCOUNT;
  if (membership.ends_on && membership.ends_on < today) return NO_DISCOUNT;
  // No lines yet (an empty cart): the customer is still a member, just with nothing to discount.
  if (lines.length === 0) return { membership: toMembership(membership), discount: 0, lines: [] };

  const productIds = Array.from(new Set(lines.map((l) => l.productId)));
  const [benefitsRes, categories, productsRes] = await Promise.all([
    supabaseAdmin
      .from("membership_plan_benefits")
      .select("discount_percent, category_ids")
      .eq("plan_id", membership.plan_id)
      .eq("store_id", storeId),
    fetchAllPaged<{ id: string; parent_id: string | null }>((from, to) =>
      supabaseAdmin
        .from("categories")
        .select("id, parent_id")
        .eq("store_id", storeId)
        .order("id")
        .range(from, to) as unknown as PromiseLike<{ data: { id: string; parent_id: string | null }[] | null; error: { message: string } | null }>,
    ),
    supabaseAdmin.from("products").select("id, category_id").eq("store_id", storeId).in("id", productIds),
  ]);

  const benefits = ((benefitsRes.data ?? []) as BenefitRow[]).map((b) => ({
    percent: Number(b.discount_percent),
    categoryIds: b.category_ids ?? [],
  }));
  if (benefits.length === 0) return { membership: toMembership(membership), discount: 0, lines: [] };

  const children = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parent_id) continue;
    const list = children.get(category.parent_id) ?? [];
    list.push(category.id);
    children.set(category.parent_id, list);
  }

  // A row covers its categories and everything below them.
  const covered = benefits.map((b) => {
    if (b.categoryIds.length === 0) return null;
    const ids = new Set<string>();
    const queue = [...b.categoryIds];
    while (queue.length > 0) {
      const id = queue.pop() as string;
      if (ids.has(id)) continue;
      ids.add(id);
      queue.push(...(children.get(id) ?? []));
    }
    return ids;
  });

  const categoryByProduct = new Map<string, string | null>(
    ((productsRes.data ?? []) as { id: string; category_id: string | null }[]).map((p) => [p.id, p.category_id]),
  );

  const results = lines
    .map((line) => {
      const categoryId = categoryByProduct.get(line.productId) ?? null;
      let percent = 0;
      benefits.forEach((b, index) => {
        const ids = covered[index];
        const applies = ids === null || (categoryId !== null && ids.has(categoryId));
        if (applies && b.percent > percent) percent = b.percent;
      });
      const amount = percent > 0 ? round2((line.unitPrice * line.quantity * percent) / 100) : 0;
      return { productId: line.productId, percent, amount };
    })
    .filter((r) => r.amount > 0);

  return {
    membership: toMembership(membership),
    // Whole taka, rounded down (৳52.50 → ৳52), so the total comes out whole too (৳298, not ৳297.50).
    discount: Math.floor(round2(results.reduce((sum, r) => sum + r.amount, 0))),
    lines: results,
  };
}

function toMembership(row: MembershipRow): { id: string; number: string; planName: string } {
  return { id: row.id, number: row.membership_number, planName: row.membership_plans?.name ?? "—" };
}
