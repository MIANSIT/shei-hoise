"use client";

import React from "react";
import { Layout } from "antd";
import SidebarBrand from "./SidebarBrand";
import SidebarMenu from "./SidebarMenu";
import SidebarProfile from "./SidebarProfile";

const { Sider } = Layout;

interface SidebarProps {
  collapsed?: boolean;
  themeMode: "light" | "dark"; // new prop
}

export default function Sidebar({ collapsed = false, themeMode }: SidebarProps) {
  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={240}
      className="flex flex-col shadow-md"
      style={{ background: "var(--sidebar)" }}
    >
      <div className="flex flex-col flex-1">
        <SidebarBrand collapsed={collapsed} />
        <SidebarMenu theme={themeMode} /> {/* pass theme down */}
      </div>
      <SidebarProfile collapsed={collapsed} />
    </Sider>
  );
}
