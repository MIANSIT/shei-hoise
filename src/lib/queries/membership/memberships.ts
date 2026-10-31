"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStore, logActivity } from "@/lib/permissions/server";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import { evaluateAllCustomers } from "./memberAutoAssign";
import { sendWelcomeForMembership } from "./membershipWelcome";
import { deleteMemberCardImage } from "./membershipCard";
import { membershipFeatureEnabled } from "./membershipFeature";
import {
  membershipStatus,
  todayInDhaka,
  type Member,
  type MembershipCustomerOption,
  type MembershipInput,
  type MembershipPlan,
  type MembershipPlanInput,
  type MembershipResult,
} from "./membershipTypes";

const NOT_IN_PLAN = "Memberships are not part of this store's plan.";
const MAX_BENEFITS = 12;
const MAX_CATEGORIES_PER_BENEFIT = 60;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const planSchema = z.object({
  name: z.string().trim().min(1, "Enter the level's name").max(60, "Name is too long"),
  isActive: z.boolean(),
  benefits: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Write what each discount row is for").max(120, "A discount row's wording is too long"),
        discountPercent: z
          .number({ message: "Enter the discount percent" })
          .gt(0, "A discount must be more than 0%")
          .max(100, "A discount cannot be more than 100%"),
        categoryIds: z.array(z.string().uuid()).max(MAX_CATEGORIES_PER_BENEFIT),
      }),
    )
    .min(1, "Add at least one discount row")
    .max(MAX_BENEFITS, `Use at most ${MAX_BENEFITS} discount rows`),
  minSpend: z
    .number({ message: "Enter the spend target as a number" })
    .gt(0, "The spend target must be more than 0")
    .nullish(),
  numberPrefix: z.string().trim().max(30, "The number prefix is too long").nullish(),
}).refine((v) => !v.minSpend || !!v.numberPrefix, {
  message: "Enter the number prefix for automatic memberships, for example PAW-126",
  path: ["numberPrefix"],
});

const membershipSchema = z
  .object({
    customerId: z.string().uuid("Choose a customer"),
    planId: z.string().uuid("Choose a level"),
    membershipNumber: z.string().trim().min(1, "Enter the membership number").max(40, "The membership number is too long"),
    startsOn: z.string().regex(DATE, "Choose the start date"),
    endsOn: z.string().regex(DATE, "Choose a valid end date").nullish(),
    notes: z.string().trim().max(500, "Notes are too long").optional(),
  })
  .refine((v) => !v.endsOn || v.endsOn >= v.startsOn, { message: "The end date cannot be before the start date", path: ["endsOn"] });

function clean(value: string | undefined | null): string | null {
  const text = value?.trim();
  return text ? text : null;
}

/** Turns a unique-index failure into a sentence the owner can act on. */
function uniqueMessage(error: { code?: string; message: string }): string | null {
  if (error.code !== "23505") return null;
  if (error.message.includes("customer_memberships_number_uniq")) return "This membership number is already used. Type a different one.";
  if (error.message.includes("customer_memberships_customer_uniq")) return "This customer already has a membership. Edit it instead.";
  if (error.message.includes("membership_plans_store_name_uniq")) return "You already have a level with this name.";
  return "This already exists.";
}

interface PlanRow {
  id: string;
  name: string;
  is_active: boolean;
  /** Only present once the auto-level migration (20261110) has been applied. */
  min_spend?: number | string | null;
  number_prefix?: string | null;
}

interface BenefitRow {
  plan_id: string;
  label: string;
  discount_percent: number | string;
  category_ids: string[] | null;
}

/**
 * The store's membership levels with their discount rows and how many members each has.
 * @returns the levels, or an empty list when not allowed or on failure
 */
export async function getMembershipPlans(storeId: string): Promise<MembershipPlan[]> {
  try {
    const auth = await authorizeForStore(storeId, "memberships.view");
    if (!auth.ok) return [];

    const [plansRes, benefitsRes, planIds] = await Promise.all([
      supabaseAdmin
        .from("membership_plans")
        // "*" so a database without the auto-level columns yet still lists its levels.
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order")
        .order("name"),
      supabaseAdmin
        .from("membership_plan_benefits")
        .select("plan_id, label, discount_percent, category_ids")
        .eq("store_id", storeId)
        .order("sort_order"),
      fetchAllPaged<{ plan_id: string }>((from, to) =>
        supabaseAdmin
          .from("customer_memberships")
          .select("plan_id")
          .eq("store_id", storeId)
          .order("id")
          .range(from, to) as unknown as PromiseLike<{ data: { plan_id: string }[] | null; error: { message: string } | null }>,
      ),
    ]);
    if (plansRes.error) throw new Error(plansRes.error.message);
    if (benefitsRes.error) throw new Error(benefitsRes.error.message);

    const counts = new Map<string, number>();
    for (const row of planIds) counts.set(row.plan_id, (counts.get(row.plan_id) ?? 0) + 1);

    const benefitsByPlan = new Map<string, BenefitRow[]>();
    for (const row of (benefitsRes.data ?? []) as BenefitRow[]) {
      const list = benefitsByPlan.get(row.plan_id) ?? [];
      list.push(row);
      benefitsByPlan.set(row.plan_id, list);
    }

    return ((plansRes.data ?? []) as PlanRow[]).map((plan) => ({
      id: plan.id,
      name: plan.name,
      isActive: plan.is_active,
      minSpend: plan.min_spend != null ? Number(plan.min_spend) : null,
      numberPrefix: plan.number_prefix ?? null,
      memberCount: counts.get(plan.id) ?? 0,
      benefits: (benefitsByPlan.get(plan.id) ?? []).map((b) => ({
        label: b.label,
        discountPercent: Number(b.discount_percent),
        categoryIds: b.category_ids ?? [],
      })),
    }));
  } catch (error) {
    console.error("getMembershipPlans failed:", error);
    return [];
  }
}

/** Every category id must belong to this store, so a level can never point at another store's categories. */
async function categoriesBelongToStore(storeId: string, categoryIds: string[]): Promise<boolean> {
  const unique = Array.from(new Set(categoryIds));
  if (unique.length === 0) return true;
  const { data, error } = await supabaseAdmin.from("categories").select("id").eq("store_id", storeId).in("id", unique);
  if (error) return false;
  return (data ?? []).length === unique.length;
}

/**
 * Creates a level, or changes one when `planId` is given. The discount rows are
 * replaced as a whole.
 * @returns success, or the first thing wrong with the input
 */
export async function saveMembershipPlan(
  storeId: string,
  planId: string | null,
  input: MembershipPlanInput,
): Promise<MembershipResult> {
  try {
    const auth = await authorizeForStore(storeId, planId ? "memberships.edit" : "memberships.add");
    if (!auth.ok) return { success: false, error: auth.error };
    if (!(await membershipFeatureEnabled(storeId))) return { success: false, error: NOT_IN_PLAN };

    const parsed = planSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;

    if (!(await categoriesBelongToStore(storeId, v.benefits.flatMap((b) => b.categoryIds)))) {
      return { success: false, error: "One of the chosen categories was not found. Reload the page and try again." };
    }

    let id = planId;
    // The spend target and number prefix are only written when the database has
    // them (migration 20261110) or the level actually uses them, so levels keep
    // saving on a database that hasn't got them yet.
    const autoFields = { min_spend: v.minSpend ?? null, number_prefix: clean(v.numberPrefix) };
    const usesAutoFields = v.minSpend != null || !!clean(v.numberPrefix);

    if (id) {
      const { data: current } = await supabaseAdmin
        .from("membership_plans")
        .select("*")
        .eq("id", id)
        .eq("store_id", storeId)
        .maybeSingle();
      if (!current) return { success: false, error: "Level not found" };
      const { data, error } = await supabaseAdmin
        .from("membership_plans")
        .update({
          name: v.name,
          is_active: v.isActive,
          ...("min_spend" in current || usesAutoFields ? autoFields : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("store_id", storeId)
        .select("id")
        .maybeSingle();
      if (error) return { success: false, error: uniqueMessage(error) ?? error.message };
      if (!data) return { success: false, error: "Level not found" };
    } else {
      const { data, error } = await supabaseAdmin
        .from("membership_plans")
        .insert({ store_id: storeId, name: v.name, is_active: v.isActive, ...(usesAutoFields ? autoFields : {}) })
        .select("id")
        .single();
      if (error) return { success: false, error: uniqueMessage(error) ?? error.message };
      id = data.id as string;
    }

    const { error: clearError } = await supabaseAdmin
      .from("membership_plan_benefits")
      .delete()
      .eq("plan_id", id)
      .eq("store_id", storeId);
    if (clearError) return { success: false, error: clearError.message };

    const { error: benefitsError } = await supabaseAdmin.from("membership_plan_benefits").insert(
      v.benefits.map((b, index) => ({
        store_id: storeId,
        plan_id: id,
        label: b.label,
        discount_percent: b.discountPercent,
        category_ids: b.categoryIds,
        sort_order: index,
      })),
    );
    if (benefitsError) return { success: false, error: benefitsError.message };

    await logActivity(auth.actor, {
      action: planId ? "memberships.edit" : "memberships.add",
      entityType: "membership_plan",
      entityId: id,
      summary: `${planId ? "Updated" : "Added"} membership level ${v.name}`,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save the level" };
  }
}

/**
 * Deletes a level that has no members.
 * @returns success, or why it could not be deleted
 */
export async function deleteMembershipPlan(storeId: string, planId: string): Promise<MembershipResult> {
  try {
    const auth = await authorizeForStore(storeId, "memberships.delete");
    if (!auth.ok) return { success: false, error: auth.error };

    const { data: existing } = await supabaseAdmin
      .from("membership_plans")
      .select("name")
      .eq("id", planId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!existing) return { success: false, error: "Level not found" };

    const { count } = await supabaseAdmin
      .from("customer_memberships")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", planId)
      .eq("store_id", storeId);
    if ((count ?? 0) > 0) {
      return { success: false, error: `${count} customer${count === 1 ? " has" : "s have"} this level. Move or remove them first.` };
    }

    const { error } = await supabaseAdmin.from("membership_plans").delete().eq("id", planId).eq("store_id", storeId);
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "memberships.delete",
      entityType: "membership_plan",
      entityId: planId,
      summary: `Deleted membership level ${existing.name}`,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete the level" };
  }
}

interface MemberRow {
  id: string;
  customer_id: string;
  plan_id: string;
  membership_number: string;
  starts_on: string;
  ends_on: string | null;
  notes: string | null;
  source?: string | null;
  welcome_email_sent_at?: string | null;
  welcome_email_to?: string | null;
  welcome_email_error?: string | null;
  store_customers: { name: string | null; phone: string | null; email: string | null } | null;
  membership_plans: { name: string } | null;
}

/**
 * Every customer in the store who holds a membership, newest first.
 * @returns the members, or an empty list when not allowed or on failure
 */
export async function getMembers(storeId: string): Promise<Member[]> {
  try {
    const auth = await authorizeForStore(storeId, "memberships.view");
    if (!auth.ok) return [];

    const rows = await fetchAllPaged<MemberRow>((from, to) =>
      supabaseAdmin
        .from("customer_memberships")
        // "*" so a database without the source column (migration 20261110) still lists its members.
        .select("*, store_customers(name, phone, email), membership_plans(name)")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to) as unknown as PromiseLike<{ data: MemberRow[] | null; error: { message: string } | null }>,
    );

    const today = todayInDhaka();
    return rows.map((r) => ({
      id: r.id,
      customerId: r.customer_id,
      customerName: r.store_customers?.name?.trim() || "—",
      customerPhone: r.store_customers?.phone ?? null,
      customerEmail: r.store_customers?.email ?? null,
      planId: r.plan_id,
      planName: r.membership_plans?.name ?? "—",
      membershipNumber: r.membership_number,
      startsOn: r.starts_on,
      endsOn: r.ends_on,
      notes: r.notes,
      status: membershipStatus(r.ends_on, today),
      source: r.source === "auto" ? "auto" : "manual",
      welcomeEmailSentAt: r.welcome_email_sent_at ?? null,
      welcomeEmailTo: r.welcome_email_to ?? null,
      welcomeEmailError: r.welcome_email_error ?? null,
    }));
  } catch (error) {
    console.error("getMembers failed:", error);
    return [];
  }
}

/**
 * Finds the store's customers by name or phone, for choosing who gets a membership.
 * @returns up to 15 matches, each marked when they already hold a membership
 */
export async function searchMembershipCustomers(storeId: string, query: string): Promise<MembershipCustomerOption[]> {
  try {
    const auth = await authorizeForStore(storeId, "memberships.add");
    if (!auth.ok) return [];

    // Keep letters (Bangla included), digits and a few safe marks: the text goes into a PostgREST filter.
    const q = query.replace(/[^\p{L}\p{N}\s+@.\-_]/gu, "").trim();
    if (q.length < 2) return [];

    const { data, error } = await supabaseAdmin
      .from("store_customer_links")
      .select("customer_id, store_customers!inner(id, name, phone, email)")
      .eq("store_id", storeId)
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`, { referencedTable: "store_customers" })
      .limit(15);
    if (error) throw new Error(error.message);

    type LinkRow = { store_customers: { id: string; name: string | null; phone: string | null; email: string | null } };
    const customers = ((data ?? []) as unknown as LinkRow[]).map((r) => r.store_customers).filter(Boolean);
    if (customers.length === 0) return [];

    const { data: held } = await supabaseAdmin
      .from("customer_memberships")
      .select("customer_id")
      .eq("store_id", storeId)
      .in("customer_id", customers.map((c) => c.id));
    const memberIds = new Set((held ?? []).map((h: { customer_id: string }) => h.customer_id));

    return customers.map((c) => ({
      id: c.id,
      name: c.name?.trim() || "—",
      phone: c.phone,
      email: c.email,
      isMember: memberIds.has(c.id),
    }));
  } catch (error) {
    console.error("searchMembershipCustomers failed:", error);
    return [];
  }
}

/** The level must be one of this store's, and active, so a membership can't point at another store's level. */
async function planIsUsable(storeId: string, planId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("membership_plans")
    .select("is_active")
    .eq("id", planId)
    .eq("store_id", storeId)
    .maybeSingle();
  return !!data?.is_active;
}

/**
 * Gives a customer a membership.
 * @returns success, or the first thing wrong with the input
 */
export async function assignMembership(storeId: string, input: MembershipInput): Promise<MembershipResult> {
  try {
    const auth = await authorizeForStore(storeId, "memberships.add");
    if (!auth.ok) return { success: false, error: auth.error };
    if (!(await membershipFeatureEnabled(storeId))) return { success: false, error: NOT_IN_PLAN };

    const parsed = membershipSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;

    const { data: link } = await supabaseAdmin
      .from("store_customer_links")
      .select("id")
      .eq("store_id", storeId)
      .eq("customer_id", v.customerId)
      .limit(1)
      .maybeSingle();
    if (!link) return { success: false, error: "Customer not found" };

    if (!(await planIsUsable(storeId, v.planId))) return { success: false, error: "Choose an active level" };

    const { data, error } = await supabaseAdmin
      .from("customer_memberships")
      .insert({
        store_id: storeId,
        customer_id: v.customerId,
        plan_id: v.planId,
        membership_number: v.membershipNumber,
        starts_on: v.startsOn,
        ends_on: v.endsOn || null,
        notes: clean(v.notes),
        assigned_by: auth.actor.userId,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: uniqueMessage(error) ?? error.message };

    await logActivity(auth.actor, {
      action: "memberships.add",
      entityType: "customer_membership",
      entityId: data.id,
      summary: `Gave membership ${v.membershipNumber}`,
      details: { customer_id: v.customerId, plan_id: v.planId },
    });

    // The membership is saved either way; a welcome email that cannot go out is reported, not fatal.
    if (input.sendWelcomeEmail) {
      const emailResult = await sendWelcomeForMembership(storeId, data.id, { toEmail: input.email });
      return { success: true, emailResult };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to give the membership" };
  }
}

/**
 * Changes a member's level, number, dates or notes. The customer stays the same.
 * @returns success, or why it failed
 */
export async function updateMembership(
  storeId: string,
  membershipId: string,
  input: Omit<MembershipInput, "customerId">,
): Promise<MembershipResult> {
  try {
    const auth = await authorizeForStore(storeId, "memberships.edit");
    if (!auth.ok) return { success: false, error: auth.error };

    const { data: current } = await supabaseAdmin
      .from("customer_memberships")
      .select("customer_id, plan_id")
      .eq("id", membershipId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!current) return { success: false, error: "Membership not found" };

    const parsed = membershipSchema.safeParse({ ...input, customerId: current.customer_id });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;

    // Moving to another level needs an active one; keeping the same level always works, even if it was switched off since.
    if (v.planId !== current.plan_id && !(await planIsUsable(storeId, v.planId))) {
      return { success: false, error: "Choose an active level" };
    }

    const { error } = await supabaseAdmin
      .from("customer_memberships")
      .update({
        plan_id: v.planId,
        membership_number: v.membershipNumber,
        starts_on: v.startsOn,
        ends_on: v.endsOn || null,
        notes: clean(v.notes),
        updated_at: new Date().toISOString(),
      })
      .eq("id", membershipId)
      .eq("store_id", storeId);
    if (error) return { success: false, error: uniqueMessage(error) ?? error.message };

    await logActivity(auth.actor, {
      action: "memberships.edit",
      entityType: "customer_membership",
      entityId: membershipId,
      summary: `Updated membership ${v.membershipNumber}`,
    });

    // Ticked while editing: send the welcome email again, even if emails are switched off for new members.
    if (input.sendWelcomeEmail) {
      const emailResult = await sendWelcomeForMembership(storeId, membershipId, { toEmail: input.email, force: true });
      return { success: true, emailResult };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update the membership" };
  }
}

/**
 * Works through every customer whose total shopping has reached a level's spend
 * target and gives them that membership (or moves an earned one up). Orders do this
 * on their own from now on; this catches customers who shopped before the target was set.
 * @returns how many customers got a membership or a higher level
 */
export async function runAutoMembershipCheck(storeId: string): Promise<{ success: boolean; given?: number; error?: string }> {
  try {
    const auth = await authorizeForStore(storeId, "memberships.add");
    if (!auth.ok) return { success: false, error: auth.error };

    const given = await evaluateAllCustomers(storeId);
    await logActivity(auth.actor, {
      action: "memberships.add",
      entityType: "customer_membership",
      summary: `Checked customers for automatic memberships: ${given} given`,
    });
    return { success: true, given };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to check customers" };
  }
}

/**
 * Takes a membership away from a customer. The customer record is not touched.
 * @returns success, or why it failed
 */
export async function removeMembership(storeId: string, membershipId: string): Promise<MembershipResult> {
  try {
    const auth = await authorizeForStore(storeId, "memberships.delete");
    if (!auth.ok) return { success: false, error: auth.error };

    const { data: existing } = await supabaseAdmin
      .from("customer_memberships")
      .select("membership_number, customer_id, plan_id")
      .eq("id", membershipId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!existing) return { success: false, error: "Membership not found" };

    const { error } = await supabaseAdmin.from("customer_memberships").delete().eq("id", membershipId).eq("store_id", storeId);
    if (error) return { success: false, error: error.message };
    await deleteMemberCardImage(storeId, membershipId);

    await logActivity(auth.actor, {
      action: "memberships.delete",
      entityType: "customer_membership",
      entityId: membershipId,
      summary: `Removed membership ${existing.membership_number}`,
      details: { customer_id: existing.customer_id, plan_id: existing.plan_id },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to remove the membership" };
  }
}
