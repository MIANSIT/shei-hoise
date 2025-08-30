"use client";

import React from "react";
import { Avatar, Dropdown, Tooltip } from "antd";
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

  const handleLogout = () => {
    logout();
    notify.success("Logout successful!");
    router.push("/admin-login");
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
    <div className="p-4 border-t border-gray-500 mt-auto">
      {collapsed ? (
        // 👉 Collapsed = true → Avatar + Dropdown for logout
        <Dropdown menu={profileMenu} placement="topRight">
          <div className="flex items-center gap-3 cursor-pointer">
            <Avatar style={{ backgroundColor: "#7265e6" }} size={40}>
              AD
            </Avatar>
          </div>
        </Dropdown>
      ) : (
        // 👉 Collapsed = false → Avatar + Name + Email + Logout icon
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar style={{ backgroundColor: "#7265e6" }} size={40}>
              AD
            </Avatar>
            <div>
              <div className="text-sm font-medium text-white">Admin</div>
              <div className="text-xs text-gray-400">admin@sheihoise.com</div>
            </div>
          </div>

          <Tooltip title="Logout">
            <button
              onClick={handleLogout}
              className="text-red-400 hover:text-red-800 transition"
            >
              <LucideIcon icon={LogOut} size={20} />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
