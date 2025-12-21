// components/header/UserDropdownMobile.tsx - FIXED VERSION
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ChevronDown, User, Package, LogOut } from "lucide-react";
import { clearCustomerCache } from "@/lib/hook/useCurrentCustomer"; // ADD THIS

interface UserDropdownMobileProps {
  customerName: string;
  customerEmail: string;
  storeSlug: string;
}

export default function UserDropdownMobile({
  customerName,
  customerEmail,
  storeSlug,
}: UserDropdownMobileProps) { // ADD PROPS HERE
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      clearCustomerCache(); // Clear customer cache
      router.refresh(); // Refresh the page
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-3 rounded-md bg-accent hover:bg-accent/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">{customerName}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[150px]">
              {customerEmail}
            </p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50">
          <Link
            href={`/${storeSlug}/my-profile`}
            className="flex items-center gap-3 p-3 hover:bg-accent transition-colors border-b"
            onClick={() => setIsOpen(false)}
          >
            <User className="h-4 w-4" />
            <span className="text-sm">My Profile</span>
          </Link>
          <Link
            href={`/${storeSlug}/order-status`}
            className="flex items-center gap-3 p-3 hover:bg-accent transition-colors border-b"
            onClick={() => setIsOpen(false)}
          >
            <Package className="h-4 w-4" />
            <span className="text-sm">My Orders</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 w-full text-left hover:bg-destructive/10 text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}