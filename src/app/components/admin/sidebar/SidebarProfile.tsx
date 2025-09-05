"use client";

import React, { useState } from "react";
import { Avatar, Dropdown, Tooltip, Spin } from "antd";
import type { MenuProps } from "antd";
import { LogOut } from "lucide-react";
import { LucideIcon } from "@/lib/LucideIcon";
import { useAuthStore } from "@/lib/store/authStore";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useRouter } from "next/navigation";

interface SidebarProfileProps {
  collapsed: boolean;
}

export default function SidebarProfile({ collapsed }: SidebarProfileProps) {
  const logout = useAuthStore((state) => state.logout);
  const notify = useSheiNotification();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      notify.success("Logout successful!");
      router.push("/admin-login");
    } catch (err) {
      console.error("Logout error:", err);
      notify.error("Logout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const profileMenu: MenuProps = {
    items: [
      {
        key: "logout",
        label: "Logout",
        danger: true,
        icon: <LucideIcon icon={LogOut} size={16} />,
        onClick: handleLogout,
      },
    ],
  };

  return (
    <div
      className="p-4 mt-auto"
      style={{
        borderTop: "1px solid var(--sidebar-border)",
        background: "var(--sidebar)",
        color: "var(--sidebar-foreground)",
      }}
    >
      {collapsed ? (
        <Dropdown menu={profileMenu} placement="topRight">
          <div className="flex items-center gap-3 cursor-pointer">
            <Avatar style={{ backgroundColor: "var(--sidebar-primary)" }} size={40}>
              AD
            </Avatar>
          </div>
        </Dropdown>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar style={{ backgroundColor: "var(--sidebar-primary)" }} size={40}>
              AD
            </Avatar>
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--sidebar-foreground)" }}>
                Admin
              </div>
              <div className="text-xs opacity-70">admin@sheihoise.com</div>
            </div>
          </div>

          <Tooltip title="Logout">
            <button
              onClick={handleLogout}
              className="transition flex items-center justify-center"
              style={{ color: "var(--destructive)" }}
              disabled={loading}
            >
              {loading ? <Spin size="small" /> : <LucideIcon icon={LogOut} size={20} />}
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
