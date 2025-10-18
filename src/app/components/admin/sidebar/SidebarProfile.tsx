"use client";

import React, { useState } from "react";
import { Avatar, Dropdown, Tooltip, Spin } from "antd";
import type { MenuProps } from "antd";
import { LogOut } from "lucide-react";
import { LucideIcon } from "@/lib/LucideIcon";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";

interface SidebarProfileProps {
  collapsed: boolean;
}

export default function SidebarProfile({ collapsed }: SidebarProfileProps) {
  const notify = useSheiNotification();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user } = useCurrentUser();

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      notify.success("Logout successful!");
      router.push("/admin-login");
    } catch (err: unknown) {
      console.error("Logout error:", err);
      if (err instanceof Error) {
        notify.error(`Logout failed: ${err.message}`);
      } else {
        notify.error("Logout failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const profileMenu: MenuProps = {
    items: [
      {
        key: "logout",
        label: "Logout",
        danger: true,
        icon: <LucideIcon icon={LogOut} size={16} />,
        onClick: handleLogout,
      },
    ],
  };

  return (
    <div
      className='p-4 mt-auto'
      style={{
        borderTop: "1px solid var(--sidebar-border)",
        background: "var(--sidebar)",
        color: "var(--sidebar-foreground)",
      }}
    >
      {collapsed ? (
        <Dropdown menu={profileMenu} placement='topRight'>
          <div className='flex items-center gap-3 cursor-pointer'>
            <Avatar
              style={{ backgroundColor: "var(--sidebar-primary)" }}
              size={40}
            >
              AD
            </Avatar>
          </div>
        </Dropdown>
      ) : (
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <Avatar
              style={{ backgroundColor: "var(--sidebar-primary)" }}
              size={40}
            >
              ADMIN
            </Avatar>
            <div>
              <div
                className='text-sm font-medium'
                style={{ color: "var(--sidebar-foreground)" }}
              >
                {user?.first_name}
              </div>
              <div className='text-xs opacity-70'>{user?.email}</div>
            </div>
          </div>

          <Tooltip title='Logout'>
            <button
              onClick={handleLogout}
              className='transition flex items-center justify-center cursor-pointer'
              style={{ color: "var(--destructive)" }}
              disabled={loading}
            >
              {loading ? (
                <Spin size='small' />
              ) : (
                <LucideIcon icon={LogOut} size={20} />
              )}
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
