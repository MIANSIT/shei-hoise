"use client";

import React, { useState } from "react";
import { Dropdown, MenuProps, Spin } from "antd";
import { User, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";

export default function SidebarProfile() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const notify = useSheiNotification();
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
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
      setLogoutLoading(false);
    }
  };

  const userMenu: MenuProps = {
    items: [
      {
        key: "profile",
        icon: <User className="w-4 h-4" />,
        label: "Profile",
        onClick: () => router.push("/dashboard/admin-profile"), // Navigate to profile
      },
      {
        type: "divider",
      },
      {
        key: "logout",
        icon: <LogOut className="w-4 h-4" />,
        label: "Logout",
        danger: true,
        onClick: handleLogout,
      },
    ],
  };

  return (
    <Dropdown menu={userMenu} trigger={["click"]} placement="bottomRight">
      <button className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-medium">
          {user?.first_name ? user.first_name.charAt(0).toUpperCase() : "U"}
        </div>
        {logoutLoading && <Spin size="small" />}
      </button>
    </Dropdown>
  );
}

//sidebarprofile
