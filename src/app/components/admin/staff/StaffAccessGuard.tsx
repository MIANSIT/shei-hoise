"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Spin } from "antd";
import { ShieldOff, LogOut } from "lucide-react";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { routeRequirement, STAFF_LANDING_ORDER } from "@/lib/permissions/routes";
import { useTranslation } from "@/lib/hook/useTranslation";
import { supabase } from "@/lib/supabase";
import { clearUserCache } from "@/lib/hook/useCurrentUser";

interface StaffAccessGuardProps {
  children: React.ReactNode;
}

const CHANGE_PASSWORD_PATH = "/dashboard/change-password";

/**
 * Wraps every dashboard page. The owner passes straight through. Staff:
 * - must set their own password before anything else,
 * - are sent from /dashboard to their first allowed page if the overview isn't theirs,
 * - see a "no access" screen on any page their role doesn't include.
 * Server actions enforce the same rules — this only keeps the UI honest.
 */
export function StaffAccessGuard({ children }: StaffAccessGuardProps) {
  const { access, loading, isOwner, can } = usePermissions();
  const pathname = usePathname() ?? "/dashboard";
  const router = useRouter();
  const t = useTranslation();

  const landing = useMemo(
    () => STAFF_LANDING_ORDER.find(([, permission]) => can(permission))?.[0] ?? null,
    [can],
  );

  const requirement = routeRequirement(pathname);
  const staffMustChange = access?.kind === "staff" && access.mustChangePassword;
  const allowed =
    isOwner ||
    requirement === "any" ||
    (requirement !== "owner" && can(requirement));

  useEffect(() => {
    if (loading || access?.kind !== "staff") return;
    if (staffMustChange && pathname !== CHANGE_PASSWORD_PATH) {
      router.replace(CHANGE_PASSWORD_PATH);
      return;
    }
    if (!staffMustChange && pathname === "/dashboard" && !allowed && landing) {
      router.replace(landing);
    }
  }, [loading, access, staffMustChange, pathname, allowed, landing, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearUserCache();
    window.location.assign("/admin-login");
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (isOwner) return <>{children}</>;

  // Signed in, but no usable access (deactivated, or the plan dropped staff logins).
  if (!access || access.kind === "none") {
    return (
      <NoAccessCard
        title={t.staff.noAccessTitle}
        body={access?.kind === "none" ? access.error : t.staff.loginNotAvailable}
        actionLabel={t.staff.logOut}
        onAction={handleLogout}
        actionIcon={<LogOut className="h-4 w-4" />}
      />
    );
  }

  if (staffMustChange && pathname !== CHANGE_PASSWORD_PATH) return null;
  if (allowed) return <>{children}</>;
  if (pathname === "/dashboard" && landing) return null; // redirecting

  return (
    <NoAccessCard
      title={t.staff.noAccessTitle}
      body={
        landing
          ? t.staff.noAccessBody.replace("{role}", access.kind === "staff" ? access.roleName : "")
          : t.staff.noAccessNothing
      }
      actionLabel={landing ? t.staff.noAccessGoTo : t.staff.logOut}
      onAction={landing ? () => router.push(landing) : handleLogout}
    />
  );
}

interface NoAccessCardProps {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  actionIcon?: React.ReactNode;
}

function NoAccessCard({ title, body, actionLabel, onAction, actionIcon }: NoAccessCardProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-background rounded-2xl shadow-xl p-8 text-center border border-border">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <ShieldOff className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{body}</p>
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
        >
          {actionIcon}
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
