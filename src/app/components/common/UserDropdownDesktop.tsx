"use client";

import { Dropdown, MenuProps } from "antd";
import Link from "next/link";
import AuthButtons from "../header/AuthButtons";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store/authStore";
import { LogoutOutlined } from "@ant-design/icons";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { SheiSkeleton } from "@/app/components/ui/shei-skeleton";
import { useParams } from "next/navigation"; // Add this import

interface UserDropdownProps {
  className?: string;
}

export default function UserDropdownDesktop({
  className = "",
}: UserDropdownProps) {
  const { user, loading } = useCurrentUser();
  const { logout } = useAuthStore();
  const { success, error } = useSheiNotification();
  const params = useParams(); // Get route params
  const store_slug = params.store_slug as string; // Get store_slug from URL

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      logout();
      success("Logged out successfully ✅");
    } catch (err) {
      console.error("Logout error:", err);
      error("Failed to log out. Please try again.");
    }
  };

  // ✅ Show inline skeleton while loading
  if (loading) {
    return (
      <div
        className={`cursor-pointer ${className} flex items-center gap-2`}
        style={{ minWidth: 100 }} // adjust to match AuthButtons width
      >
        <SheiSkeleton className="h-10 w-24 rounded-md" />
      </div>
    );
  }

  // ✅ Show nothing if no user
  if (!user) return null;

  const items: MenuProps["items"] = [
    {
      key: "profile",
      label: <Link href={`/${store_slug}/user-profile`}>Profile</Link>, // Updated
    },
    {
      key: "orders",
      label: <Link href={`/${store_slug}/order-status`}>Order Status</Link>, // Updated
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      label: (
        <button
          onClick={handleLogout}
          className="w-full text-left flex items-center gap-2 text-red-500 font-semibold hover:text-red-600"
        >
          <LogoutOutlined /> Logout
        </button>
      ),
    },
  ];

  return (
    <Dropdown
      menu={{ items }}
      trigger={["click"]}
      placement="bottomRight"
      arrow={false}
    >
      <div className={`cursor-pointer ${className}`}>
        <AuthButtons
          links={[
            {
              name: user.first_name || "Profile",
              path: "#",
              isHighlighted: true,
            },
          ]}
          isAdminPanel={false}
          disableNavigation={true}
        />
      </div>
    </Dropdown>
  );
}
