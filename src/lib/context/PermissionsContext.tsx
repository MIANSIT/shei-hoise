"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMyAccess, type MyAccess } from "@/lib/queries/staff/getMyAccess";
import type { RoleLimits } from "@/lib/permissions/catalog";

interface PermissionsState {
  loading: boolean;
  access: MyAccess | null;
  isOwner: boolean;
  isStaff: boolean;
  /** Owner: always true. Staff: only when their role has the permission. */
  can: (permission: string) => boolean;
  limits: RoleLimits;
  refresh: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsState | null>(null);

const EMPTY_LIMITS: RoleLimits = {};

interface PermissionsProviderProps {
  children: React.ReactNode;
  /** Re-fetches when this changes (e.g. the signed-in user id). */
  userKey: string | null;
}

export function PermissionsProvider({ children, userKey }: PermissionsProviderProps) {
  const [access, setAccess] = useState<MyAccess | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setAccess(await getMyAccess());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userKey) {
      setAccess(null);
      setLoading(false);
      return;
    }
    refresh();
  }, [userKey, refresh]);

  const value = useMemo<PermissionsState>(() => {
    const permissionSet =
      access?.kind === "staff" ? new Set(access.permissions) : new Set<string>();
    return {
      loading,
      access,
      isOwner: access?.kind === "owner",
      isStaff: access?.kind === "staff",
      can: (permission: string) =>
        access?.kind === "owner" || (access?.kind === "staff" && permissionSet.has(permission)),
      limits: access?.kind === "staff" ? access.limits : EMPTY_LIMITS,
      refresh,
    };
  }, [access, loading, refresh]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

/**
 * Current dashboard user's permissions. Outside the dashboard provider it
 * behaves as "owner" so shared components keep working unchanged.
 * @returns can(), isOwner, isStaff, limits and loading state
 */
export function usePermissions(): PermissionsState {
  const ctx = useContext(PermissionsContext);
  if (ctx) return ctx;
  return {
    loading: false,
    access: null,
    isOwner: true,
    isStaff: false,
    can: () => true,
    limits: EMPTY_LIMITS,
    refresh: async () => {},
  };
}

interface CanProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/** Renders children only when the current user has `permission`. */
export function Can({ permission, children, fallback = null }: CanProps) {
  const { can, loading } = usePermissions();
  if (loading) return null;
  return <>{can(permission) ? children : fallback}</>;
}
