"use server";

import { getActor, logActivity } from "@/lib/permissions/server";

/**
 * Records an owner's email login in the activity log. Staff logins are
 * recorded by /api/auth/staff-login itself, so this skips them.
 */
export async function recordOwnerLogin(): Promise<void> {
  try {
    const result = await getActor();
    if (!result.ok || result.actor.kind !== "owner") return;
    await logActivity(result.actor, { action: "auth.login", summary: "Logged in" });
  } catch (err) {
    console.error("recordOwnerLogin failed:", err);
  }
}
