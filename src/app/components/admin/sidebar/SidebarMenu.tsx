"use client";

import React, { useMemo } from "react";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { sideMenu } from "@/lib/menu";
import { LucideIcon } from "@/lib/LucideIcon";
interface SidebarMenuProps {
  themeMode: "light" | "dark";
}
type AntdMenuItem = Required<MenuProps>["items"][number];

const buildMenuItems = (menu: typeof sideMenu): AntdMenuItem[] =>
  menu.map((item) => {
    const icon = item.icon ? <LucideIcon icon={item.icon} /> : null;

    if (item.children?.length) {
      return {
        key: item.title,
        icon,
        label: item.title,
        children: buildMenuItems(item.children),
      };
    }
    return { key: item.href || item.title, icon, label: item.title };
  });

export default function SidebarMenu({ themeMode }: SidebarMenuProps) {
  const pathname = usePathname();
  const router = useRouter();

  const items = useMemo(() => buildMenuItems(sideMenu), []);
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

  return (
    <Menu
      mode="inline"
      selectedKeys={[pathname]}
      defaultOpenKeys={defaultOpenKeys}
      items={items}
      onClick={handleClick}
      style={{
        flex: 1,
        borderRight: 0,
        background: "transparent",
      }}
    />
  );
}
