"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { BRANCH_SCOPE_ERROR, canUseBranch, requirePermission } from "@/lib/permissions/server";
import type { ActivityPerson, ActivityRow } from "./types";

export interface ActivityLogFilters {
  page?: number;
  pageSize?: number;
  userId?: string | null;
  /** Matches the start of the action, e.g. ["auth."] or ["expenses.", "cod."] */
  actionPrefixes?: string[] | null;
  /** ISO dates (inclusive), Asia/Dhaka calendar days */
  from?: string | null;
  to?: string | null;
  /** Stores with branches: only this branch's actions. */
  branchId?: string | null;
}

export type ActivityLogResult =
  | { ok: true; rows: ActivityRow[]; total: number; people: ActivityPerson[] }
  | { ok: false; error: string };

interface ActivityDbRow {
  id: string;
  created_at: string;
  user_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  branch_id: string | null;
}

const ACTION_PREFIX_PATTERN = /^[a-z_]+\.[a-z_]*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Newest-first page of the store's activity log. Needs activity.view. */
export async function getActivityLog(filters: ActivityLogFilters = {}): Promise<ActivityLogResult> {
  try {
    const auth = await requirePermission("activity.view");
    if (!auth.ok) return auth;
    const { storeId } = auth.actor;
    if (filters.branchId && !canUseBranch(auth.actor, filters.branchId)) {
      return { ok: false, error: BRANCH_SCOPE_ERROR };
    }

    const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 100);
    const page = Math.max(filters.page ?? 1, 1);
    const from = (page - 1) * pageSize;

    let query = supabaseAdmin
      .from("store_activity_log")
      .select(
        "id, created_at, user_id, actor_name, actor_role, action, entity_type, entity_id, summary, details, ip, user_agent, branch_id",
        { count: "exact" },
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (filters.userId) query = query.eq("user_id", filters.userId);
    if (filters.branchId) {
      query = query.eq("branch_id", filters.branchId);
    } else if (auth.actor.kind === "staff" && !auth.actor.allBranches) {
      // Staff limited to some branches only see their branches' actions.
      query = auth.actor.branchIds.length
        ? query.in("branch_id", auth.actor.branchIds)
        : query.eq("branch_id", "00000000-0000-0000-0000-000000000000");
    }
    const prefixes = (filters.actionPrefixes ?? []).filter((p) => ACTION_PREFIX_PATTERN.test(p));
    if (prefixes.length > 0) {
      query = query.or(prefixes.map((p) => `action.like.${p}*`).join(","));
    }
    if (filters.from && DATE_PATTERN.test(filters.from)) {
      query = query.gte("created_at", `${filters.from}T00:00:00+06:00`);
    }
    if (filters.to && DATE_PATTERN.test(filters.to)) {
      query = query.lte("created_at", `${filters.to}T23:59:59.999+06:00`);
    }

    const [{ data, count, error }, { data: staffRows }, { data: ownerRow }] = await Promise.all([
      query,
      supabaseAdmin.from("store_staff").select("user_id, display_name").eq("store_id", storeId),
      supabaseAdmin
        .from("users")
        .select("id, first_name, last_name")
        .eq("store_id", storeId)
        .eq("user_type", "store_owner")
        .limit(1)
        .maybeSingle(),
    ]);

    if (error) {
      console.error("getActivityLog failed:", error.message);
      return { ok: false, error: "Could not load the activity log." };
    }

    const people: ActivityPerson[] = [];
    if (ownerRow) {
      const ownerName = [ownerRow.first_name, ownerRow.last_name].filter(Boolean).join(" ").trim();
      people.push({ userId: ownerRow.id, name: `${ownerName || "Owner"} (Owner)` });
    }
    ((staffRows as { user_id: string; display_name: string }[]) ?? []).forEach((s) =>
      people.push({ userId: s.user_id, name: s.display_name }),
    );

    const rows: ActivityRow[] = ((data as ActivityDbRow[]) ?? []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      userId: r.user_id,
      actorName: r.actor_name,
      actorRole: r.actor_role,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      summary: r.summary,
      details: r.details,
      ip: r.ip,
      userAgent: r.user_agent,
      branchId: r.branch_id ?? null,
    }));

    return { ok: true, rows, total: count ?? 0, people };
  } catch (err) {
    console.error("getActivityLog failed:", err);
    return { ok: false, error: "Could not load the activity log." };
  }
}
