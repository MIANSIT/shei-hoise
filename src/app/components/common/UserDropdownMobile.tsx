"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentCustomer } from "@/lib/hook/useCurrentCustomer"; // UPDATED
import { useAuthStore } from "@/lib/store/authStore";
import { supabase } from "@/lib/supabase";
import { LogoutOutlined } from "@ant-design/icons";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { ButtonSkeleton } from "@/app/components/skeletons/ButtonSkeleton";
import { useParams } from "next/navigation";
import { clearCustomerCache } from "@/lib/hook/useCurrentCustomer"; // ADD THIS

export default function UserDropdownMobile() {
  const params = useParams();
  const storeSlug = params.store_slug as string;
  
  // UPDATED: Use useCurrentCustomer instead of useCurrentUser
  const { 
    customer, 
    loading, 
    isLoggedIn,
    authEmail 
  } = useCurrentCustomer(storeSlug);
  
  const { logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const { success, error } = useSheiNotification();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      logout();
      clearCustomerCache(); // Clear customer cache
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

  // Get customer display name
  const customerDisplayName = customer?.name || 
                             customer?.email?.split('@')[0] || 
                             authEmail?.split('@')[0] || 
                             "Customer";

  if (isLoggedIn && customer) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex justify-between items-center px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium"
        >
          {customerDisplayName}
          <span className="ml-2 transform transition-transform duration-200">
            {open ? "▲" : "▼"}
          </span>
        </button>

        {open && (
          <div className="mt-2 bg-background border border-border rounded-md shadow-lg flex flex-col overflow-hidden">
            <Link
              href={`/${storeSlug}/my-profile`}
              className="flex items-center px-4 py-2 hover:bg-accent transition duration-200 ease-in-out font-medium rounded-md"
            >
              👤 Profile
            </Link>
            <Link
              href={`/${storeSlug}/order-status`}
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

  // Not logged in - show sign in link
  return (
    <Link
      href={`/login?redirect=/${storeSlug}`}
      className="w-full block text-center px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium"
    >
      Sign In
    </Link>
  );
}