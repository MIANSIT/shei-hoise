"use client";

import React from "react";
import { Layout } from "antd";
// import SidebarBrand from "./SidebarBrand";
import SidebarMenu from "./SidebarMenu";
import SidebarProfile from "./SidebarProfile";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useRouter } from "next/navigation";

const { Sider } = Layout;

interface SidebarProps {
  collapsed?: boolean;
  themeMode: "light" | "dark";
}

export default function Sidebar({
  collapsed = false,
  themeMode,
}: SidebarProps) {
  const { storeSlug } = useCurrentUser();
  const router = useRouter();

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={240}
      collapsedWidth={70}
      breakpoint="md"
      className="flex flex-col shadow-md"
      style={{ background: "var(--sidebar)" }}
    >
      <div className="flex flex-col flex-1">
        {/* Top: Logo / Brand */}
        {/* <SidebarBrand collapsed={collapsed} /> */}

        {/* Middle: Menu */}
        <SidebarMenu themeMode={themeMode} storeSlug={storeSlug} />

        {/* Bottom: Profile + Store Button */}
        <div className=" ">
          <SidebarProfile collapsed={collapsed} />
          <div className="p-4 flex items-center justify-center  ">
            {storeSlug && (
              <button
                onClick={() => router.push(`/${storeSlug}`)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-muted-foreground text-secondary rounded shadow  transition-colors duration-200 cursor-pointer hover:bg-accent-foreground "
              >
                {/* Optional store icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 9l9-6 9 6v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 22V12h6v10"
                  />
                </svg>
                {!collapsed && <span>Go to Store</span>}
              </button>
            )}
          </div>
        </div>
      </div>
    </Sider>
  );
}
