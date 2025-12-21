"use client";

import { Dropdown, MenuProps } from "antd";
import Link from "next/link";
import AuthButtons from "../header/AuthButtons";
import { useCurrentCustomer } from "@/lib/hook/useCurrentCustomer"; // UPDATED
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store/authStore";
import { LogoutOutlined } from "@ant-design/icons";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { SheiSkeleton } from "@/app/components/ui/shei-skeleton";
import { useParams } from "next/navigation";
import { clearCustomerCache } from "@/lib/hook/useCurrentCustomer"; // ADD THIS

interface UserDropdownProps {
  className?: string;
  customerName: string; // ADD THESE PROPS
  customerEmail: string;
  storeSlug: string;
}

export default function UserDropdownDesktop({
  className = "",
  customerName,
  customerEmail,
  storeSlug,
}: UserDropdownProps) {
  const { loading } = useCurrentCustomer(storeSlug); // UPDATED
  const { logout } = useAuthStore();
  const { success, error } = useSheiNotification();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      logout();
      clearCustomerCache(); // Clear customer cache
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
        style={{ minWidth: 100 }}
      >
        <SheiSkeleton className="h-10 w-24 rounded-md" />
      </div>
    );
  }

  const items: MenuProps["items"] = [
    {
      key: "profile",
      label: <Link href={`/${storeSlug}/my-profile`}>Profile</Link>,
    },
    {
      key: "orders",
      label: <Link href={`/${storeSlug}/order-status`}>Order Status</Link>,
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
              name: customerName || "Profile",
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