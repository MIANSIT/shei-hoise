"use client";

import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

interface SidebarLinkProps {
  title: string;
  href?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  isActive?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
  children?: React.ReactNode;
}

export default function SidebarLink({
  title,
  href,
  icon: Icon,
  isActive = false,
  onClick,
  collapsed = false,
  children,
}: SidebarLinkProps) {
  const content = (
    <div
      className={`flex items-center justify-between p-2 rounded hover:bg-gray-700 cursor-pointer ${
        isActive ? "bg-gray-800 font-bold" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5" />}
        {!collapsed && <span>{title}</span>}
      </div>
      {!collapsed && children}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
