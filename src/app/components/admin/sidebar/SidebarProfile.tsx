"use client";

import React from "react";
import { Avatar } from "antd";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";

interface SidebarProfileProps {
  collapsed: boolean;
}

export default function SidebarProfile({ collapsed }: SidebarProfileProps) {
  const { user } = useCurrentUser();

  return (
    <div
      className="p-4 mt-auto"
      style={{
        borderTop: "1px solid var(--sidebar-border)",
        background: "var(--sidebar)",
        color: "var(--sidebar-foreground)",
      }}
    >
      <div className="flex items-center gap-3 w-full">
        <Avatar style={{ backgroundColor: "var(--sidebar-primary)" }} size={30}>
          {user?.first_name ? user.first_name.charAt(0).toUpperCase() : "A"}
        </Avatar>
        {!collapsed && (
          <div className="min-w-0">
            <div
              className="text-sm font-medium truncate"
              style={{ color: "var(--sidebar-foreground)" }}
              title={user?.first_name}
            >
              {user?.first_name}
            </div>
            <div className="text-xs opacity-70 truncate" title={user?.email}>
              {user?.email}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
