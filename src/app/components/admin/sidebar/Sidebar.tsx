"use client";

import React from "react";
import { Layout } from "antd";
import SidebarBrand from "./SidebarBrand";
import SidebarMenu from "./SidebarMenu";
import SidebarProfile from "./SidebarProfile";

const { Sider } = Layout;

interface SidebarProps {
  collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={240}
      className="shadow-md  flex flex-col "
      theme="dark"
    >
      <div className="flex flex-col ">
        <SidebarBrand collapsed={collapsed} />
        <SidebarMenu />
      </div>
      <SidebarProfile collapsed={collapsed} />
    </Sider>
  );
}
