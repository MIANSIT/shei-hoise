"use client";

import React, { useMemo } from "react";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { sideMenu, MenuItem } from "@/lib/menu";
import { LucideIcon } from "@/lib/LucideIcon";
import { useTranslation } from "@/lib/hook/useTranslation";

interface SidebarMenuProps {
  themeMode: "light" | "dark";
  storeSlug?: string | null;
  isMobile?: boolean;
  onMobileMenuClick?: () => void;
}

type AntdMenuItem = Required<MenuProps>["items"][number];

function renderIcon(
  IconComponent?: React.ComponentType<React.SVGProps<SVGSVGElement>>,
) {
  return IconComponent ? <LucideIcon icon={IconComponent} /> : null;
}

function mapMenuItem(
  item: MenuItem,
  translateTitle: (title: string) => string,
  storeSlug?: string | null,
  onMobileMenuClick?: () => void,
): AntdMenuItem {
  const icon = renderIcon(item.icon);

  if (item.children?.length) {
    const children: AntdMenuItem[] = item.children.map((child) => {
      if (child.title === "Generate Order Link" && storeSlug) {
        return {
          key: `/${storeSlug}/generate-orders-link`,
          icon: renderIcon(child.icon),
          label: translateTitle(child.title),
          title: translateTitle(child.title),
          onClick: (e) => {
            e.domEvent.stopPropagation();
            window.open(`/${storeSlug}/generate-orders-link`, "_blank");
            onMobileMenuClick?.();
          },
        };
      }

      return {
        key: child.href || child.title,
        icon: renderIcon(child.icon),
        label: translateTitle(child.title),
      };
    });

    return {
      key: item.title,
      icon,
      label: translateTitle(item.title),
      children,
    };
  }

  return {
    key: item.href || item.title,
    icon,
    label: translateTitle(item.title),
  };
}

export default function SidebarMenu({
  storeSlug,
  isMobile = false,
  onMobileMenuClick,
}: SidebarMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslation();

  const translateTitle = (title: string): string => {
    const map: Record<string, string> = {
      "Dashboard": t.admin.menuDashboard,
      "Users": t.admin.menuUsers,
      "All Users": t.admin.menuAllUsers,
      "Create Users": t.admin.menuCreateUsers,
      "Products": t.admin.menuProducts,
      "Add Product": t.admin.menuAddProduct,
      "Stock Update": t.admin.menuStockUpdate,
      "All Products": t.admin.menuAllProducts,
      "All Categories": t.admin.menuAllCategories,
      "Orders": t.admin.menuOrders,
      "Create Order": t.admin.menuCreateOrder,
      "All Orders": t.admin.menuAllOrders,
      "Generate Order Link": t.admin.menuGenerateOrderLink,
      "Setting": t.admin.menuSetting,
      "Shipping": t.admin.menuShipping,
      "Financial": t.admin.menuFinancial,
      "Expense": t.admin.menuExpense,
      "Category": t.admin.menuCategory,
      "Pixel Analytics": t.admin.menuPixelAnalytics,
      "Subscription": t.admin.menuSubscription,
      "Pathao Courier": t.admin.menuPathaoCourier,
    };
    return map[title] ?? title;
  };

  const items = useMemo(
    () => sideMenu.map((i) => mapMenuItem(i, translateTitle, storeSlug, onMobileMenuClick)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeSlug, onMobileMenuClick, t],
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
    if (e.key.includes("generate-orders-link")) {
      return;
    }

    const flatten = sideMenu.flatMap((i) => i.children || [i]);
    const clicked = flatten.find((i) => i.href === e.key);
    if (clicked?.href) {
      router.push(clicked.href);
      if (isMobile && onMobileMenuClick) {
        onMobileMenuClick();
      }
    }
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
