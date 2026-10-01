"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActor, logActivity } from "@/lib/permissions/server";
import { STAFF_MIN_PASSWORD_LENGTH } from "@/lib/permissions/staffIdentity";
import type { ActionResult } from "./types";

/**
 * Staff replace the temporary password the owner gave them. Clears
 * must_change_password, which is what lets them past the dashboard's
 * change-password screen.
 */
export async function changeOwnPassword(newPassword: string): Promise<ActionResult> {
  try {
    const result = await getActor();
    if (!result.ok) return result;
    const { actor } = result;
    if (actor.kind !== "staff") {
      return { ok: false, error: "Owners change their password from the profile page." };
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < STAFF_MIN_PASSWORD_LENGTH ||
      newPassword.length > 72
    ) {
      return { ok: false, error: `Use at least ${STAFF_MIN_PASSWORD_LENGTH} characters` };
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(actor.userId, {
      password: newPassword,
    });
    if (error) return { ok: false, error: "Could not save the password. Please try again." };

    await supabaseAdmin
      .from("store_staff")
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq("id", actor.staffId);

    await logActivity(actor, { action: "auth.password_changed", summary: "Changed own password" });
    return { ok: true };
  } catch (err) {
    console.error("changeOwnPassword failed:", err);
    return { ok: false, error: "Could not save the password. Please try again." };
  }
}
