"use server";

import { getActor } from "@/lib/permissions/server";
import type { RoleLimits } from "@/lib/permissions/catalog";

export type MyAccess =
  | { kind: "owner"; name: string; storeId: string }
  | {
      kind: "staff";
      name: string;
      storeId: string;
      username: string;
      roleName: string;
      permissions: string[];
      limits: RoleLimits;
      mustChangePassword: boolean;
    }
  | { kind: "none"; error: string };

/** What the signed-in dashboard user may see and do, for the client-side menu and buttons. */
export async function getMyAccess(): Promise<MyAccess> {
  try {
    const result = await getActor();
    if (!result.ok) return { kind: "none", error: result.error };

    const { actor } = result;
    if (actor.kind === "owner") {
      return { kind: "owner", name: actor.name, storeId: actor.storeId };
    }
    return {
      kind: "staff",
      name: actor.name,
      storeId: actor.storeId,
      username: actor.username,
      roleName: actor.roleName,
      permissions: Array.from(actor.permissions),
      limits: actor.limits,
      mustChangePassword: actor.mustChangePassword,
    };
  } catch (err) {
    console.error("getMyAccess failed:", err);
    return { kind: "none", error: "Could not load your access. Please refresh." };
  }
}
