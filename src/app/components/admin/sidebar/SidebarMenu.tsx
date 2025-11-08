// SidebarMenu component - Fix the icon issue
"use client";

import React, { useMemo } from "react";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { sideMenu, MenuItem } from "@/lib/menu";
import { LucideIcon } from "@/lib/LucideIcon";

interface SidebarMenuProps {
  themeMode: "light" | "dark";
  storeSlug?: string | null;
}

type AntdMenuItem = Required<MenuProps>["items"][number];

// Helper function to safely render icons
function renderIcon(
  IconComponent?: React.ComponentType<React.SVGProps<SVGSVGElement>>
) {
  return IconComponent ? <LucideIcon icon={IconComponent} /> : null;
}

function mapMenuItem(item: MenuItem, storeSlug?: string | null): AntdMenuItem {
  const icon = renderIcon(item.icon);

  if (item.children?.length) {
    const children: AntdMenuItem[] = item.children.map((child) => {
      // Handle Generate Order Link specially
      if (child.title === "Generate Order Link" && storeSlug) {
        return {
          key: `/${storeSlug}/generate-orders-link`,
          icon: renderIcon(child.icon),
          label: "Generate Order Link", // Plain text label for both states
          title: "Generate Order Link",
          onClick: (e) => {
            e.domEvent.stopPropagation();
            window.open(`/${storeSlug}/generate-orders-link`, "_blank");
          },
        };
      }

      // Regular menu items
      return {
        key: child.href || child.title,
        icon: renderIcon(child.icon),
        label: child.title,
      };
    });

    return {
      key: item.title,
      icon,
      label: item.title,
      children,
    };
  }

  return {
    key: item.href || item.title,
    icon,
    label: item.title,
  };
}

export default function SidebarMenu({
  themeMode,
  storeSlug,
}: SidebarMenuProps) {
  const pathname = usePathname();
  const router = useRouter();

  const items = useMemo(
    () => sideMenu.map((i) => mapMenuItem(i, storeSlug)),
    [storeSlug]
  );

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
    // Skip navigation for Generate Order Link (it has its own onClick)
    if (e.key.includes("generate-orders-link")) {
      return;
    }

    const flatten = sideMenu.flatMap((i) => i.children || [i]);
    const clicked = flatten.find((i) => i.href === e.key);
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
