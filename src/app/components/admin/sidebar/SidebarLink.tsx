"use client";

import Link from "next/link";
import React from "react";

interface SidebarLinkProps {
  title: string;
  href?: string; // If present, this renders a <Link>
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  isActive?: boolean;
  onClick?: () => void; // For buttons that toggle submenus
  children?: React.ReactNode; // Optional nested content like chevron
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ title, href, icon: Icon, isActive, onClick, children }) => {
  const content = (
    <span className="flex items-center justify-between w-full">
      <span className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-white" />}
        <span>{title}</span>
      </span>
      {children}
    </span>
  );

  // Render as Link if href exists, otherwise as a button
  return href ? (
    <Link
      href={href}
      className={`w-full flex items-center justify-between px-4 py-2 text-left rounded-md relative transition-colors duration-200
        ${isActive ? "bg-gray-800 text-white font-semibold border-l-4 border-blue-500" : "hover:bg-gray-700 hover:text-white"}
      `}
    >
      {content}
    </Link>
  ) : (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2 text-left rounded-md relative transition-colors duration-200
        ${isActive ? "bg-gray-800 text-white font-semibold border-l-4 border-blue-500" : "hover:bg-gray-700 hover:text-white"}
      `}
    >
      {content}
    </button>
  );
};

export default SidebarLink;
