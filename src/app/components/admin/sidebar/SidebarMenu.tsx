"use client";

import React, { useMemo } from "react";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { sideMenu, MenuItem } from "@/lib/menu";
import { LucideIcon } from "@/lib/LucideIcon";
import { Link2 } from "lucide-react";
import Link from "next/link";

interface SidebarMenuProps {
  themeMode: "light" | "dark";
  storeSlug?: string | null;
}

// AntD Menu item type
type AntdMenuItem = Required<MenuProps>["items"][number];

function mapMenuItem(item: MenuItem, storeSlug?: string | null): AntdMenuItem {
  const icon = item.icon ? <LucideIcon icon={item.icon} /> : null;

  if (item.children?.length) {
    const children: AntdMenuItem[] = item.children.map((child) =>
      mapMenuItem(child, storeSlug)
    );

    // Inject dynamic "Generate Order Link" under Orders
    if (item.title === "Orders" && storeSlug) {
      children.push({
        key: `generate-order-link`,
        icon: <LucideIcon icon={Link2} />,
        label: (
          <Link
            href={`/${storeSlug}/generate-orders-link`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            Generate Order Link
          </Link>
        ),
      });
    }

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
    const flatten = sideMenu.flatMap((i) => i.children || [i]);

    if (storeSlug) {
      const ordersMenu = sideMenu.find((i) => i.title === "Orders");
      if (ordersMenu) {
        flatten.push({
          title: "Generate Order Link",
          href: `/${storeSlug}/generate-orders-link`,
        });
      }
    }

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
