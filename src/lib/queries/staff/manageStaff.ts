"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { checkLimit, hasFeature } from "@/lib/utils/planFeatures";
import {
  logActivity,
  requireOwner,
  MAX_STAFF_LIMIT,
  STAFF_ACCOUNTS_FEATURE,
  type OwnerActor,
} from "@/lib/permissions/server";
import {
  buildStaffUsername,
  staffEmailFor,
  STAFF_MIN_PASSWORD_LENGTH,
  STAFF_NAME_PATTERN,
} from "@/lib/permissions/staffIdentity";
import { sanitizeLimits, SYSTEM_ROLE_TEMPLATES } from "@/lib/permissions/catalog";
import type { ActionResult, RoleListItem, StaffListItem, StaffOverview } from "./types";

/**
 * Owner-only management of staff logins. Every action resolves the owner
 * from the session (requireOwner) — nothing trusts a store id from the client.
 */

const FOREVER_BAN = "876000h"; // ~100 years; Supabase's way of saying "banned"

interface StaffDbRow {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  phone: string | null;
  role_id: string;
  is_active: boolean;
  must_change_password: boolean;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
  all_branches: boolean;
  branch_ids: string[] | null;
  store_roles: { name: string } | null;
}

interface RoleDbRow {
  id: string;
  name: string;
  description: string | null;
  permissions: string[] | null;
  limits: unknown;
  is_system: boolean;
}

function toStaffItem(row: StaffDbRow): StaffListItem {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    phone: row.phone,
    roleId: row.role_id,
    roleName: row.store_roles?.name ?? "",
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    lockedUntil: row.locked_until,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    allBranches: row.all_branches,
    branchIds: row.branch_ids ?? [],
  };
}

/** Seeds the ready-made roles the first time a store opens the Staff page. */
async function ensureSystemRoles(storeId: string): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from("store_roles")
    .select("name")
    .eq("store_id", storeId);

  const have = new Set((existing ?? []).map((r: { name: string }) => r.name.toLowerCase()));
  const missing = SYSTEM_ROLE_TEMPLATES.filter((tpl) => !have.has(tpl.name.toLowerCase()));
  if ((existing ?? []).length > 0 || missing.length === 0) return;

  await supabaseAdmin.from("store_roles").insert(
    missing.map((tpl) => ({
      store_id: storeId,
      name: tpl.name,
      description: tpl.description,
      permissions: [...tpl.permissions],
      limits: tpl.limits,
      is_system: true,
    })),
  );
}

async function countActiveStaff(storeId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("store_staff")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("is_active", true);
  return count ?? 0;
}

async function staffFeatureCheck(storeId: string) {
  const subscription = await getStoreFeatureSubscription(storeId);
  return { subscription, enabled: hasFeature(subscription, STAFF_ACCOUNTS_FEATURE) };
}

async function getOwnedStaff(owner: OwnerActor, staffId: string): Promise<StaffDbRow | null> {
  const { data } = await supabaseAdmin
    .from("store_staff")
    .select(
      "id, user_id, username, display_name, phone, role_id, is_active, must_change_password, locked_until, last_login_at, created_at, all_branches, branch_ids, store_roles (name)",
    )
    .eq("id", staffId)
    .eq("store_id", owner.storeId)
    .maybeSingle();
  return (data as unknown as StaffDbRow | null) ?? null;
}

async function roleBelongsToStore(storeId: string, roleId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("store_roles")
    .select("id")
    .eq("id", roleId)
    .eq("store_id", storeId)
    .maybeSingle();
  return !!data;
}

/**
 * Branch scope from the form: "all branches", or a list that must belong to
 * this store. Returns the values to store, or an error message.
 */
async function resolveBranchScope(
  storeId: string,
  allBranches: boolean | undefined,
  branchIds: string[] | undefined,
): Promise<{ all_branches: boolean; branch_ids: string[] } | { error: string }> {
  if (allBranches !== false) return { all_branches: true, branch_ids: [] };
  const ids = Array.from(new Set(branchIds ?? []));
  if (ids.length === 0) return { error: "Choose at least one branch, or give access to all branches." };
  const { data } = await supabaseAdmin.from("store_branches").select("id").eq("store_id", storeId).in("id", ids);
  if ((data ?? []).length !== ids.length) return { error: "Branch not found" };
  return { all_branches: false, branch_ids: ids };
}

async function revokeSessions(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc("revoke_user_sessions", { p_user_id: userId });
  if (error) console.error("revoke_user_sessions failed:", error.message);
}

/* ----------------------------------------------------------------------- */

/** Everything the Staff & Roles page needs, in one call. */
export async function getStaffOverview(): Promise<StaffOverview> {
  try {
    const auth = await requireOwner();
    if (!auth.ok) return auth;
    const { storeId } = auth.actor;

    const { subscription, enabled } = await staffFeatureCheck(storeId);
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("store_slug")
      .eq("id", storeId)
      .maybeSingle();

    if (!enabled) {
      return {
        ok: true,
        featureEnabled: false,
        storeSlug: store?.store_slug ?? "",
        maxStaff: 0,
        activeCount: 0,
        staff: [],
        roles: [],
      };
    }

    await ensureSystemRoles(storeId);

    const [{ data: staffRows }, { data: roleRows }] = await Promise.all([
      supabaseAdmin
        .from("store_staff")
        .select(
          "id, user_id, username, display_name, phone, role_id, is_active, must_change_password, locked_until, last_login_at, created_at, all_branches, branch_ids, store_roles (name)",
        )
        .eq("store_id", storeId)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("store_roles")
        .select("id, name, description, permissions, limits, is_system")
        .eq("store_id", storeId)
        .order("is_system", { ascending: false })
        .order("created_at", { ascending: true }),
    ]);

    const staff = ((staffRows as unknown as StaffDbRow[]) ?? []).map(toStaffItem);
    const memberCounts = new Map<string, number>();
    staff.forEach((s) => memberCounts.set(s.roleId, (memberCounts.get(s.roleId) ?? 0) + 1));

    const roles: RoleListItem[] = ((roleRows as RoleDbRow[]) ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions ?? [],
      limits: sanitizeLimits(r.limits),
      isSystem: r.is_system,
      memberCount: memberCounts.get(r.id) ?? 0,
    }));

    const activeCount = staff.filter((s) => s.isActive).length;
    const limit = checkLimit(subscription, MAX_STAFF_LIMIT, activeCount);

    return {
      ok: true,
      featureEnabled: true,
      storeSlug: store?.store_slug ?? "",
      maxStaff: limit.limit,
      activeCount,
      staff,
      roles,
    };
  } catch (err) {
    console.error("getStaffOverview failed:", err);
    return { ok: false, error: "Could not load staff. Please refresh." };
  }
}

const createStaffSchema = z.object({
  displayName: z.string().trim().min(1, "Enter their name").max(80),
  name: z
    .string()
    .trim()
    .toLowerCase()
    .regex(STAFF_NAME_PATTERN, "Use 3 to 30 letters, numbers or underscore"),
  password: z.string().min(STAFF_MIN_PASSWORD_LENGTH, `Use at least ${STAFF_MIN_PASSWORD_LENGTH} characters`).max(72),
  phone: z.string().trim().max(20).optional().nullable(),
  roleId: z.string().uuid("Choose a role"),
  allBranches: z.boolean().optional(),
  branchIds: z.array(z.string().uuid()).optional(),
});

export type CreateStaffInput = z.input<typeof createStaffSchema>;

export async function createStaff(input: CreateStaffInput): Promise<ActionResult<{ username: string }>> {
  try {
    const auth = await requireOwner();
    if (!auth.ok) return auth;
    const owner = auth.actor;

    const parsed = createStaffSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
    const { displayName, name, password, phone, roleId, allBranches, branchIds } = parsed.data;

    const { subscription, enabled } = await staffFeatureCheck(owner.storeId);
    if (!enabled) return { ok: false, error: "Staff logins aren't included in your plan." };

    const limit = checkLimit(subscription, MAX_STAFF_LIMIT, await countActiveStaff(owner.storeId));
    if (!limit.allowed) {
      return { ok: false, error: `Your plan allows up to ${limit.limit} staff.` };
    }

    if (!(await roleBelongsToStore(owner.storeId, roleId))) return { ok: false, error: "Choose a role" };
    const scope = await resolveBranchScope(owner.storeId, allBranches, branchIds);
    if ("error" in scope) return { ok: false, error: scope.error };

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("store_slug")
      .eq("id", owner.storeId)
      .single();
    if (!store?.store_slug) return { ok: false, error: "Store not found" };

    const username = buildStaffUsername(store.store_slug, name);
    const { data: taken } = await supabaseAdmin
      .from("store_staff")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (taken) return { ok: false, error: `The username ${username} is already taken.` };

    const email = staffEmailFor(username);
    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: displayName, user_type: "store_staff" },
    });
    if (authError || !created?.user) {
      const message = authError?.message ?? "";
      return {
        ok: false,
        error: /already|registered|exists/i.test(message)
          ? `The username ${username} is already taken.`
          : "Could not create the login. Please try again.",
      };
    }
    const userId = created.user.id;

    const { error: userError } = await supabaseAdmin.from("users").insert({
      id: userId,
      email,
      password_hash: "AUTH_MANAGED",
      first_name: displayName,
      last_name: "",
      phone: phone || null,
      user_type: "store_staff",
      email_verified: true,
      is_active: true,
      store_id: owner.storeId,
    });

    const { data: staffRow, error: staffError } = userError
      ? { data: null, error: userError }
      : await supabaseAdmin
          .from("store_staff")
          .insert({
            store_id: owner.storeId,
            user_id: userId,
            username,
            display_name: displayName,
            phone: phone || null,
            role_id: roleId,
            must_change_password: true,
            created_by: owner.userId,
            ...scope,
          })
          .select("id")
          .single();

    if (staffError || !staffRow) {
      // Undo the half-created login so the username is free to try again.
      await supabaseAdmin.from("users").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.error("createStaff insert failed:", staffError?.message);
      return { ok: false, error: "Could not create the login. Please try again." };
    }

    await logActivity(owner, {
      action: "staff.create",
      entityType: "staff",
      entityId: staffRow.id,
      summary: `Added ${displayName} (${username})`,
      details: { username, role_id: roleId },
    });

    return { ok: true, data: { username } };
  } catch (err) {
    console.error("createStaff failed:", err);
    return { ok: false, error: "Could not create the login. Please try again." };
  }
}

const updateStaffSchema = z.object({
  staffId: z.string().uuid(),
  displayName: z.string().trim().min(1, "Enter their name").max(80),
  phone: z.string().trim().max(20).optional().nullable(),
  roleId: z.string().uuid("Choose a role"),
  allBranches: z.boolean().optional(),
  branchIds: z.array(z.string().uuid()).optional(),
});

export type UpdateStaffInput = z.input<typeof updateStaffSchema>;

export async function updateStaff(input: UpdateStaffInput): Promise<ActionResult> {
  try {
    const auth = await requireOwner();
    if (!auth.ok) return auth;
    const owner = auth.actor;

    const parsed = updateStaffSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
    const { staffId, displayName, phone, roleId, allBranches, branchIds } = parsed.data;

    const before = await getOwnedStaff(owner, staffId);
    if (!before) return { ok: false, error: "Staff member not found" };
    if (!(await roleBelongsToStore(owner.storeId, roleId))) return { ok: false, error: "Choose a role" };
    // Only change branch access when the form sent it (stores with branches).
    const scope =
      allBranches === undefined ? null : await resolveBranchScope(owner.storeId, allBranches, branchIds);
    if (scope && "error" in scope) return { ok: false, error: scope.error };

    const { error } = await supabaseAdmin
      .from("store_staff")
      .update({
        display_name: displayName,
        phone: phone || null,
        role_id: roleId,
        ...(scope ?? {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId)
      .eq("store_id", owner.storeId);
    if (error) return { ok: false, error: "Could not save. Please try again." };

    await supabaseAdmin
      .from("users")
      .update({ first_name: displayName, phone: phone || null })
      .eq("id", before.user_id);

    const { data: newRole } = await supabaseAdmin
      .from("store_roles")
      .select("name")
      .eq("id", roleId)
      .maybeSingle();

    const roleChanged = before.role_id !== roleId;
    await logActivity(owner, {
      action: "staff.update",
      entityType: "staff",
      entityId: staffId,
      summary: roleChanged
        ? `${displayName}: role ${before.store_roles?.name ?? "?"} → ${newRole?.name ?? "?"}`
        : `Updated ${displayName}`,
      details: {
        before: { display_name: before.display_name, phone: before.phone, role: before.store_roles?.name },
        after: { display_name: displayName, phone: phone || null, role: newRole?.name },
      },
    });

    return { ok: true };
  } catch (err) {
    console.error("updateStaff failed:", err);
    return { ok: false, error: "Could not save. Please try again." };
  }
}

export async function setStaffActive(staffId: string, active: boolean): Promise<ActionResult> {
  try {
    const auth = await requireOwner();
    if (!auth.ok) return auth;
    const owner = auth.actor;

    const staff = await getOwnedStaff(owner, staffId);
    if (!staff) return { ok: false, error: "Staff member not found" };
    if (staff.is_active === active) return { ok: true };

    if (active) {
      const { subscription } = await staffFeatureCheck(owner.storeId);
      const limit = checkLimit(subscription, MAX_STAFF_LIMIT, await countActiveStaff(owner.storeId));
      if (!limit.allowed) return { ok: false, error: `Your plan allows up to ${limit.limit} staff.` };
    }

    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(staff.user_id, {
      ban_duration: active ? "none" : FOREVER_BAN,
    });
    if (banError) {
      console.error("setStaffActive ban update failed:", banError.message);
      return { ok: false, error: "Could not update the login. Please try again." };
    }

    await supabaseAdmin
      .from("store_staff")
      .update({
        is_active: active,
        deactivated_at: active ? null : new Date().toISOString(),
        failed_login_count: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId)
      .eq("store_id", owner.storeId);

    if (!active) await revokeSessions(staff.user_id);

    await logActivity(owner, {
      action: active ? "staff.activate" : "staff.deactivate",
      entityType: "staff",
      entityId: staffId,
      summary: `${active ? "Activated" : "Deactivated"} ${staff.display_name}`,
    });

    return { ok: true };
  } catch (err) {
    console.error("setStaffActive failed:", err);
    return { ok: false, error: "Could not update the login. Please try again." };
  }
}

export async function resetStaffPassword(staffId: string, password: string): Promise<ActionResult> {
  try {
    const auth = await requireOwner();
    if (!auth.ok) return auth;
    const owner = auth.actor;

    if (typeof password !== "string" || password.length < STAFF_MIN_PASSWORD_LENGTH || password.length > 72) {
      return { ok: false, error: `Use at least ${STAFF_MIN_PASSWORD_LENGTH} characters` };
    }

    const staff = await getOwnedStaff(owner, staffId);
    if (!staff) return { ok: false, error: "Staff member not found" };

    const { error } = await supabaseAdmin.auth.admin.updateUserById(staff.user_id, { password });
    if (error) return { ok: false, error: "Could not reset the password. Please try again." };

    await supabaseAdmin
      .from("store_staff")
      .update({
        must_change_password: true,
        failed_login_count: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId)
      .eq("store_id", owner.storeId);

    await revokeSessions(staff.user_id);

    await logActivity(owner, {
      action: "staff.reset_password",
      entityType: "staff",
      entityId: staffId,
      summary: `Reset password for ${staff.display_name}`,
    });

    return { ok: true };
  } catch (err) {
    console.error("resetStaffPassword failed:", err);
    return { ok: false, error: "Could not reset the password. Please try again." };
  }
}

export async function forceLogoutStaff(staffId: string): Promise<ActionResult> {
  try {
    const auth = await requireOwner();
    if (!auth.ok) return auth;
    const owner = auth.actor;

    const staff = await getOwnedStaff(owner, staffId);
    if (!staff) return { ok: false, error: "Staff member not found" };

    await revokeSessions(staff.user_id);

    await logActivity(owner, {
      action: "staff.force_logout",
      entityType: "staff",
      entityId: staffId,
      summary: `Logged ${staff.display_name} out everywhere`,
    });

    return { ok: true };
  } catch (err) {
    console.error("forceLogoutStaff failed:", err);
    return { ok: false, error: "Could not log them out. Please try again." };
  }
}

export async function unlockStaff(staffId: string): Promise<ActionResult> {
  try {
    const auth = await requireOwner();
    if (!auth.ok) return auth;
    const owner = auth.actor;

    const staff = await getOwnedStaff(owner, staffId);
    if (!staff) return { ok: false, error: "Staff member not found" };

    await supabaseAdmin
      .from("store_staff")
      .update({ failed_login_count: 0, locked_until: null, updated_at: new Date().toISOString() })
      .eq("id", staffId)
      .eq("store_id", owner.storeId);

    await logActivity(owner, {
      action: "staff.unlock",
      entityType: "staff",
      entityId: staffId,
      summary: `Unlocked ${staff.display_name}`,
    });

    return { ok: true };
  } catch (err) {
    console.error("unlockStaff failed:", err);
    return { ok: false, error: "Could not unlock. Please try again." };
  }
}
