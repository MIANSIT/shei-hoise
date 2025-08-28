"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MenuItem } from "@/lib/menu";
import { ChevronDown, ChevronUp } from "lucide-react";
import SidebarLink from "./SidebarLink";

interface SidebarItemProps {
  item: MenuItem;
  collapsed?: boolean;
}

export default function SidebarItem({ item, collapsed = false }: SidebarItemProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const hasChildren = item.children && item.children.length > 0;
  const isActive = !!(item.href && pathname === item.href);

  return (
    <div>
      {/* Parent link */}
      {hasChildren ? (
        <SidebarLink
          title={item.title}
          icon={item.icon}
          isActive={isActive}
          onClick={() => setOpen(!open)}
          collapsed={collapsed}
        >
          {!collapsed && (open ? <ChevronUp className="w-4 h-4 text-white" /> : <ChevronDown className="w-4 h-4 text-white" />)}
        </SidebarLink>
      ) : (
        <SidebarLink
          title={item.title}
          icon={item.icon}
          href={item.href}
          isActive={isActive}
          collapsed={collapsed}
        />
      )}

      {/* Submenu links */}
      {hasChildren && open && !collapsed && (
        <div className="pl-6 mt-1 space-y-1">
          {item.children!.map((child) => {
            const isChildActive = !!(child.href && pathname === child.href);
            return (
              <SidebarLink
                key={child.title}
                title={child.title}
                icon={child.icon}
                href={child.href}
                isActive={isChildActive}
                collapsed={collapsed}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
