"use client";

import { useState } from "react";
import type { MenuItem } from "@/lib/menu";
import { ChevronDown, ChevronUp } from "lucide-react";
import SidebarLink from "./SidebarLink";
import { usePathname } from "next/navigation";

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
      <SidebarLink
        title={item.title}
        icon={item.icon}
        href={!hasChildren ? item.href : undefined}
        isActive={isActive}
        collapsed={collapsed}
        onClick={hasChildren ? () => setOpen(!open) : undefined}
      >
        {!collapsed && hasChildren && (open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
      </SidebarLink>

      {hasChildren && open && !collapsed && (
        <div className="pl-6 mt-1 space-y-1">
          {item.children!.map((child) => (
            <SidebarItem key={child.title} item={child} collapsed={collapsed} />
          ))}
        </div>
      )}
    </div>
  );
}
