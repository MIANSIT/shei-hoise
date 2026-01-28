"use client";

import React from "react";
import { Layout, Dropdown } from "antd";
import { Home, Copy } from "lucide-react";
import SidebarMenu from "./SidebarMenu";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const { Sider } = Layout;

interface SidebarProps {
  collapsed?: boolean;
  themeMode: "light" | "dark";
  isMobile?: boolean;
  onMobileMenuClick?: () => void; // Add this prop
}

export default function Sidebar({
  collapsed = false,
  themeMode,
  isMobile = false,
  onMobileMenuClick,
}: SidebarProps) {
  const { storeSlug } = useCurrentUser();
  const router = useRouter();

  const storeMenu = {
    items: [
      {
        key: "go",
        icon: <Home className="w-5 h-5" />,
        label: "Go to Store",
        onClick: () => {
          router.push(`/${storeSlug}`);
          onMobileMenuClick?.(); // Close drawer on mobile
        },
      },
      {
        key: "copy",
        icon: <Copy className="w-5 h-5" />,
        label: "Copy Store Link",
        onClick: () => {
          const storeUrl = `${window.location.origin}/${storeSlug}`;
          navigator.clipboard
            .writeText(storeUrl)
            .then(() => {
              toast.success("Store link copied!");
              onMobileMenuClick?.(); // Close drawer on mobile
            })
            .catch(() => toast.error("Failed to copy link"));
        },
      },
    ],
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      className="flex flex-col"
      style={{
        background: "var(--sidebar)",
      }}
    >
      <div className="flex flex-col flex-1">
        {/* Middle: Menu */}
        <SidebarMenu
          themeMode={themeMode}
          storeSlug={storeSlug}
          isMobile={isMobile}
          onMobileMenuClick={onMobileMenuClick} // Pass to SidebarMenu
        />

        {/* Bottom: Store Dropdown */}
        <div className="mt-auto">
          {storeSlug && (
            <div className="p-2 flex items-center justify-center w-full">
              <Dropdown
                menu={storeMenu}
                trigger={["click"]}
                styles={{
                  root: {
                    minWidth: isMobile ? "calc(100vw - 32px)" : undefined,
                  },
                }}
              >
                <button className="flex items-center justify-center gap-3 px-4 py-3 bg-muted-foreground text-secondary rounded shadow transition-colors duration-200 cursor-pointer hover:bg-accent-foreground w-full">
                  {/* Bigger Store / Copy Icon */}
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
                  {!collapsed && <span>Store Options</span>}
                </button>
              </Dropdown>
            </div>
          )}
        </div>
      </div>
    </Sider>
  );
}
