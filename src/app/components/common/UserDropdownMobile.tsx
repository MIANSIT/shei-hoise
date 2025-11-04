"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useAuthStore } from "@/lib/store/authStore";
import { supabase } from "@/lib/supabase";
import { LogoutOutlined } from "@ant-design/icons";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { ButtonSkeleton } from "@/app/components/skeletons/ButtonSkeleton";

export default function UserDropdownMobile() {
  const { user, loading } = useCurrentUser(); // ✅ use 'loading' from your hook
  const { logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const { success, error } = useSheiNotification();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      logout();
      setOpen(false);
      success("Logged out successfully ✅");
    } catch (err) {
      console.error("Logout failed:", err);
      error("Failed to log out. Please try again.");
    }
  };

  // ✅ Show skeleton while loading
  if (loading) {
    return <ButtonSkeleton fullWidth />;
  }

  if (user) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex justify-between items-center px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium"
        >
          {user.first_name || "Profile"}
          <span className="ml-2 transform transition-transform duration-200">
            {open ? "▲" : "▼"}
          </span>
        </button>

        {open && (
          <div className="mt-2 bg-background border border-border rounded-md shadow-lg flex flex-col overflow-hidden">
            <Link
              href="/profile"
              className="flex items-center px-4 py-2 hover:bg-accent transition duration-200 ease-in-out font-medium rounded-md"
            >
              👤 Profile
            </Link>
            <Link
              href="/order-status"
              className="flex items-center px-4 py-2 hover:bg-accent transition duration-200 ease-in-out font-medium rounded-md"
            >
              📦 Order Status
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 mt-1 rounded-md bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90 transition"
            >
              <LogoutOutlined /> Logout
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="w-full block text-center px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium"
    >
      Sign In
    </Link>
  );
}
