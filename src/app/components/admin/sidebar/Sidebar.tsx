"use client";

import React from "react";
import { Layout } from "antd";
import SidebarBrand from "./SidebarBrand";
import SidebarMenu from "./SidebarMenu";
import SidebarProfile from "./SidebarProfile";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";

const { Sider } = Layout;

interface SidebarProps {
  collapsed?: boolean;
  themeMode: "light" | "dark";
}

export default function Sidebar({
  collapsed = false,
  themeMode,
}: SidebarProps) {
  const { storeSlug } = useCurrentUser(); // <-- get store slug

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={240} // desktop width
      collapsedWidth={70} // collapsed width for mobile/tablet
      breakpoint="md" // auto collapse on <768px
      className="flex flex-col shadow-md"
      style={{ background: "var(--sidebar)" }}
    >
      <div className="flex flex-col flex-1">
        <SidebarBrand collapsed={collapsed} />
        {/* Pass storeSlug as prop */}
        <SidebarMenu themeMode={themeMode} storeSlug={storeSlug} />
      </div>
      <SidebarProfile collapsed={collapsed} />
    </Sider>
  );
}
