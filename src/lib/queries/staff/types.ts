import type { RoleLimits } from "@/lib/permissions/catalog";

export interface StaffListItem {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  phone: string | null;
  roleId: string;
  roleName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface RoleListItem {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  limits: RoleLimits;
  isSystem: boolean;
  memberCount: number;
}

export type StaffOverview =
  | {
      ok: true;
      featureEnabled: boolean;
      storeSlug: string;
      /** -1 = unlimited */
      maxStaff: number;
      activeCount: number;
      staff: StaffListItem[];
      roles: RoleListItem[];
    }
  | { ok: false; error: string };

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

export interface ActivityRow {
  id: string;
  createdAt: string;
  userId: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
}

export interface ActivityPerson {
  userId: string;
  name: string;
}
