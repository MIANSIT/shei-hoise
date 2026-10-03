"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import { Truck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { sideMenu, MenuItem } from "@/lib/menu";
import { LucideIcon } from "@/lib/LucideIcon";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { getDeliveryCouriers } from "@/lib/queries/deliveryCouriers/getDeliveryCouriers";
import type { DeliveryCourier } from "@/lib/types/store/store";
import {
  getStoreSubscription,
  type StoreSubscription,
} from "@/lib/queries/subscription/getStoreSubscription";
import { hasFeature } from "@/lib/utils/planFeatures";
import { getStoreBySlugWithLogo } from "@/lib/queries/stores/getStoreBySlugWithLogo";
import { onStoreSetupCompleted } from "@/lib/utils/storeSetupEvent";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { routeRequirement } from "@/lib/permissions/routes";

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
  labelFor: (item: MenuItem) => string,
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
          label: labelFor(child),
          title: labelFor(child),
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
        // title: the full name on hover, in case a long label is still cut off.
        label: <span title={labelFor(child)}>{labelFor(child)}</span>,
      };
    });

    return {
      key: item.title,
      icon,
      label: labelFor(item),
      children,
    };
  }

  return {
    key: item.href || item.title,
    icon,
    label: labelFor(item),
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
  const { storeId } = useCurrentUser();
  const { can, isOwner, loading: permissionsLoading } = usePermissions();

  const [couriers, setCouriers] = useState<DeliveryCourier[]>([]);
  const [subscription, setSubscription] = useState<StoreSubscription | null>(null);
  const [setupCompleted, setSetupCompleted] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    getDeliveryCouriers(storeId).then(setCouriers);
    getStoreSubscription(storeId).then(setSubscription);
  }, [storeId]);

  useEffect(() => {
    if (!storeSlug) return;
    getStoreBySlugWithLogo(storeSlug).then((store) => {
      setSetupCompleted(!!store?.setup_completed_at);
    });
  }, [storeSlug]);

  // The wizard that finishes setup lives on a different route than the
  // sidebar (which stays mounted across dashboard navigations), so react to
  // the broadcast instead of only relying on the fetch above ever re-running.
  useEffect(() => onStoreSetupCompleted(() => setSetupCompleted(true)), []);

  const courierHref = (courier: DeliveryCourier): string => {
    if (courier.type === "pathao") return "/dashboard/courier/pathao";
    if (courier.type === "steadfast") return "/dashboard/courier/steadfast";
    return `/dashboard/courier/manual/${courier.id}`;
  };

  // Same static sideMenu, except the "Courier" node's Pathao/Steadfast/custom
  // children are DB-driven — no courier name is hardcoded here, only the
  // fixed "Delivery Courier" management link stays static. Most gated
  // features (Pixel Analytics, Financial, Courier) keep their nav link
  // visible regardless of plan — entitlement is enforced by each page
  // (FeatureLocked), not by hiding the link. "Vendors" is the one exception:
  // items with requiredFeature set are filtered out of the sidebar entirely
  // when the store's plan doesn't include that feature.
  //
  // Staff additionally only see links their role allows (see
  // src/lib/permissions/routes.ts); a group left with no links is dropped.
  // StaffAccessGuard in the dashboard layout is what actually blocks a page.
  const resolvedMenu = useMemo<MenuItem[]>(() => {
    if (permissionsLoading) return [];

    const isAllowed = (item: MenuItem): boolean => {
      if (isOwner) return true;
      if (item.ownerOnly) return false;
      if (!item.href) return true;
      // Opens the public order-link generator; only useful to someone who can add orders.
      if (!item.href.startsWith("/dashboard")) return can("orders.add");
      const requirement = routeRequirement(item.href);
      if (requirement === "owner") return false;
      if (requirement === "any") return true;
      return can(requirement);
    };

    return sideMenu
      .filter((item) => !item.requiredFeature || hasFeature(subscription, item.requiredFeature))
      .filter((item) => !item.hideWhenSetupComplete || (!setupCompleted && isOwner))
      .filter(isAllowed)
      .map((item) =>
        item.children
          ? {
              ...item,
              children: item.children.filter(
                (child) =>
                  (!child.requiredFeature || hasFeature(subscription, child.requiredFeature)) &&
                  isAllowed(child),
              ),
            }
          : item,
      )
      .map((item) => {
        if (item.title !== "Courier" || !item.children) return item;
        return {
          ...item,
          children: [
            ...couriers
              .map((courier) => ({
                title: courier.name,
                href: courierHref(courier),
                icon: Truck,
              }))
              .filter(isAllowed),
            ...item.children,
          ],
        };
      })
      .filter((item) => !item.children || item.children.length > 0);
  }, [couriers, subscription, setupCompleted, permissionsLoading, isOwner, can]);

  // Courier children come from the DB (Pathao, Steadfast, custom names);
  // the two built-in ones get their translated card titles.
  const courierLabels: Record<string, string> = {
    Pathao: t.admin.pathaoCardTitle,
    Steadfast: t.admin.steadfastCardTitle,
  };
  const labelFor = (item: MenuItem): string =>
    item.labelKey ? t.admin[item.labelKey] : courierLabels[item.title] ?? item.title;

  const items = useMemo(
    () => resolvedMenu.map((i) => mapMenuItem(i, labelFor, storeSlug, onMobileMenuClick)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedMenu, storeSlug, onMobileMenuClick, t],
  );

  const defaultOpenKeys = useMemo(() => {
    const keys: string[] = [];
    resolvedMenu.forEach((menu) => {
      if (menu.children?.some((child) => child.href === pathname)) {
        keys.push(menu.title);
      }
    });
    return keys;
  }, [resolvedMenu, pathname]);

  const handleClick: MenuProps["onClick"] = (e) => {
    if (e.key.includes("generate-orders-link")) {
      return;
    }

    const flatten = resolvedMenu.flatMap((i) => i.children || [i]);
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
      // Default 24px per level indents sub-items 48px, leaving little room for the label.
      inlineIndent={16}
      selectedKeys={[pathname]}
      defaultOpenKeys={defaultOpenKeys}
      items={items}
      onClick={handleClick}
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        borderRight: 0,
        background: "transparent",
      }}
    />
  );
}
