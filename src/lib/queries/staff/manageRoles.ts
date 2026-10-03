"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logActivity, requireOwner } from "@/lib/permissions/server";
import { sanitizeLimits, sanitizePermissions } from "@/lib/permissions/catalog";
import type { ActionResult } from "./types";

/** Owner-only create / edit / delete of store_roles. */

const saveRoleSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1, "Enter a role name").max(60),
  description: z.string().trim().max(200).optional().nullable(),
  permissions: z.array(z.string()).max(200),
  limits: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type SaveRoleInput = z.input<typeof saveRoleSchema>;

export async function saveRole(input: SaveRoleInput): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await requireOwner();
    if (!auth.ok) return auth;
    const owner = auth.actor;

    const parsed = saveRoleSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };

    const { id, name, description } = parsed.data;
    const permissions = sanitizePermissions(parsed.data.permissions);
    const limits = sanitizeLimits(parsed.data.limits);

    const { data: sameName } = await supabaseAdmin
      .from("store_roles")
      .select("id")
      .eq("store_id", owner.storeId)
      .ilike("name", name.replace(/[%_]/g, "\\$&"))
      .maybeSingle();
    if (sameName && sameName.id !== id) {
      return { ok: false, error: `A role called "${name}" already exists.` };
    }

    if (id) {
      const { data: before } = await supabaseAdmin
        .from("store_roles")
        .select("id, name, permissions, limits")
        .eq("id", id)
        .eq("store_id", owner.storeId)
        .maybeSingle();
      if (!before) return { ok: false, error: "Role not found" };

      const { error } = await supabaseAdmin
        .from("store_roles")
        .update({
          name,
          description: description || null,
          permissions,
          limits,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("store_id", owner.storeId);
      if (error) return { ok: false, error: "Could not save the role. Please try again." };

      const beforePerms = new Set<string>(before.permissions ?? []);
      const afterPerms = new Set(permissions);
      await logActivity(owner, {
        action: "role.update",
        entityType: "role",
        entityId: id,
        summary: `Updated role ${name}`,
        details: {
          added: permissions.filter((p) => !beforePerms.has(p)),
          removed: Array.from(beforePerms).filter((p) => !afterPerms.has(p)),
          limits_before: before.limits,
          limits_after: limits,
          ...(before.name !== name ? { renamed_from: before.name } : {}),
        },
      });
      return { ok: true, data: { id } };
    }

    const { data: created, error } = await supabaseAdmin
      .from("store_roles")
      .insert({
        store_id: owner.storeId,
        name,
        description: description || null,
        permissions,
        limits,
        is_system: false,
      })
      .select("id")
      .single();
    if (error || !created) return { ok: false, error: "Could not save the role. Please try again." };

    await logActivity(owner, {
      action: "role.create",
      entityType: "role",
      entityId: created.id,
      summary: `Created role ${name}`,
      details: { permissions, limits },
    });
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    console.error("saveRole failed:", err);
    return { ok: false, error: "Could not save the role. Please try again." };
  }
}

export async function deleteRole(roleId: string): Promise<ActionResult> {
  try {
    const auth = await requireOwner();
    if (!auth.ok) return auth;
    const owner = auth.actor;

    const { data: role } = await supabaseAdmin
      .from("store_roles")
      .select("id, name, permissions, limits, is_system")
      .eq("id", roleId)
      .eq("store_id", owner.storeId)
      .maybeSingle();
    if (!role) return { ok: false, error: "Role not found" };
    if (role.is_system) return { ok: false, error: "Ready-made roles can be edited but not deleted." };

    const { count } = await supabaseAdmin
      .from("store_staff")
      .select("id", { count: "exact", head: true })
      .eq("role_id", roleId);
    if ((count ?? 0) > 0) {
      return { ok: false, error: `Move the ${count} staff with this role to another role first.` };
    }

    const { error } = await supabaseAdmin
      .from("store_roles")
      .delete()
      .eq("id", roleId)
      .eq("store_id", owner.storeId);
    if (error) return { ok: false, error: "Could not delete the role. Please try again." };

    await logActivity(owner, {
      action: "role.delete",
      entityType: "role",
      entityId: roleId,
      summary: `Deleted role ${role.name}`,
      details: { deleted_record: role },
    });
    return { ok: true };
  } catch (err) {
    console.error("deleteRole failed:", err);
    return { ok: false, error: "Could not delete the role. Please try again." };
  }
}
