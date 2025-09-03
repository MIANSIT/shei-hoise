"use client";

import React, { useMemo } from "react";
import { Menu, ConfigProvider, theme as antdTheme } from "antd";
import type { MenuProps } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { sideMenu } from "@/lib/menu";
import { LucideIcon } from "@/lib/LucideIcon";

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

interface SidebarMenuProps {
  theme?: "light" | "dark";
}

export default function SidebarMenu({ theme = "light" }: SidebarMenuProps) {
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
    <ConfigProvider
      theme={{
        algorithm:
          theme === "dark"
            ? antdTheme.darkAlgorithm
            : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#3b82f6",
          borderRadius: 8,
        },
        components: {
          Menu: {
            // default text color
            itemColor: theme === "dark" ? "#d1d5db" : "#374151",
            // hover effect
            itemHoverBg: theme === "dark" ? "#1f2937" : "#e5e7eb",
            itemHoverColor: theme === "dark" ? "#f9fafb" : "#111827",
            // active / selected item (applies to main + sub items)
            itemSelectedBg: theme === "dark" ? "#374151" : "#000000", // gray for dark, black for light
            itemSelectedColor: theme === "dark" ? "#ffffff" : "#ffffff", // white text in both
            groupTitleColor: theme === "dark" ? "#d1d5db" : "#374151", // group title color
          },
        },
      }}
    >
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
    </ConfigProvider>
  );
}
