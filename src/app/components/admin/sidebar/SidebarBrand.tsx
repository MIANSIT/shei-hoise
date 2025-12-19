"use client";

import React from "react";

interface SidebarBrandProps {
  collapsed: boolean;
}

export default function SidebarBrand({ collapsed }: SidebarBrandProps) {
  return (
    <div
      className="h-16 flex items-center justify-center font-bold text-lg tracking-wide"
      style={{
        borderBottom: "1px solid var(--sidebar-border)",
        color: "var(--sidebar-foreground)",
        background: "var(--sidebar)",
      }}
    ></div>
  );
}
