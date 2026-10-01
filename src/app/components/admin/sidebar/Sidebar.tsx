"use client";

import React from "react";
import { Layout, Dropdown } from "antd";
import { Home, Copy } from "lucide-react";
import SidebarMenu from "./SidebarMenu";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "@/lib/hook/useTranslation";

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
  const t = useTranslation();

  const storeMenu = {
    items: [
      {
        key: "go",
        icon: <Home className="w-5 h-5" />,
        label: t.admin.menuViewStore,
        onClick: () => {
          router.push(`/${storeSlug}`);
          onMobileMenuClick?.(); // Close drawer on mobile
        },
      },
      {
        key: "copy",
        icon: <Copy className="w-5 h-5" />,
        label: t.admin.menuCopyStoreLink,
        onClick: () => {
          const storeUrl = `${window.location.origin}/${storeSlug}`;
          navigator.clipboard
            .writeText(storeUrl)
            .then(() => {
              toast.success(t.admin.menuStoreLinkCopied);
              onMobileMenuClick?.(); // Close drawer on mobile
            })
            .catch(() => toast.error(t.admin.menuStoreLinkCopyFailed));
        },
      },
    ],
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      // antd's default 200px cut off nested labels ("Storefront Desi…",
      // "Announce…"), especially in Bangla.
      width={256}
      className="flex flex-col"
      style={{
        background: "var(--sidebar)",
        height: "100%",
      }}
    >
      <div className="flex flex-col flex-1 h-full min-h-0">
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
                  {!collapsed && <span>{t.admin.menuStoreOptions}</span>}
                </button>
              </Dropdown>
            </div>
          )}
        </div>
      </div>
    </Sider>
  );
}
