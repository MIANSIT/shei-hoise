"use client";

import React from "react";

interface SidebarBrandProps {
  collapsed: boolean;
}

export default function SidebarBrand({ collapsed }: SidebarBrandProps) {
  return (
    <div className="h-16 flex items-center justify-center text-white font-bold text-lg tracking-wide border-b border-gray-800">
      {collapsed ? "🛒" : "My Admin"}
    </div>
  );
}
