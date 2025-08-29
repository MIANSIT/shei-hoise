"use client";

import React, { useMemo } from "react";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { sideMenu, MenuItem } from "@/lib/menu";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

type AntdMenuItem = Required<MenuProps>["items"][number];

// Recursively convert sideMenu to AntD menu items
const buildMenuItems = (menu: MenuItem[]): AntdMenuItem[] => {
  return menu.map((item) => {
    if (item.children && item.children.length > 0) {
      return {
        key: item.title,
        icon: item.icon
          ? React.createElement(item.icon, { className: "w-5 h-5" })
          : null,
        label: item.title,
        children: buildMenuItems(item.children),
      };
    }
    return {
      key: item.href || item.title,
      icon: item.icon
        ? React.createElement(item.icon, { className: "w-5 h-5" })
        : null,
      label: item.title,
    };
  });
};

interface SidebarProps {
  collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const notify = useSheiNotification();

  const items = useMemo(() => buildMenuItems(sideMenu), []);

  // Find default open keys based on current pathname
  const defaultOpenKeys = useMemo(() => {
    const keys: string[] = [];
    sideMenu.forEach((menu) => {
      if (menu.children?.some((child) => child.href === pathname)) {
        keys.push(menu.title);
      }
    });
    return keys;
  }, [pathname]);

  const handleClick: MenuProps["onClick"] = (e) => {
    const clicked = sideMenu
      .flatMap((i) => i.children || [i])
      .find((i) => i.href === e.key);
    if (clicked?.href) router.push(clicked.href);
  };

  const handleLogout = () => {
    logout();
    notify.success("Logout successful!");
    router.push("/admin-login");
  };

  return (
    <aside
      className={`flex flex-col max-h-screen bg-black dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}
    >
      {/* AntD Menu */}
      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        defaultOpenKeys={defaultOpenKeys}
        items={items}
        onClick={handleClick}
        inlineCollapsed={collapsed}
        className="flex-1 overflow-y-auto custom-antd-menu"
      />
      {/* Profile + Logout */}
      <div className="p-4 border-t border-gray-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold">
            U
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-white">John Doe</span>
              <span className="text-xs text-gray-400">john@example.com</span>
            </div>
          )}
        </div>

        <button
          className={`p-2 rounded hover:bg-gray-700 text-red-500 transition-all duration-300 ${
            collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
          }`}
          title="Logout"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}
