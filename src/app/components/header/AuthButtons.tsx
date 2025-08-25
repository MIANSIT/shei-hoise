"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NavLink } from "./NavMenu";
import { useAuthStore } from "@/lib/store/authStore";

interface AuthButtonsProps {
  links: NavLink[];
  isAdminPanel?: boolean; 
  isVertical?: boolean; // optional prop for stacking
}

export default function AuthButtons({
  links,
  isAdminPanel = false,
  isVertical = false,
}: AuthButtonsProps) {
  const { isAdminLoggedIn, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push("/admin-login");
  };

  // Show Logout only if logged in AND in admin panel
  if (isAdminLoggedIn && isAdminPanel) {
    return (
      <button
        onClick={handleLogout}
        className="px-4 py-1.5 rounded-md bg-red-500 text-white font-semibold hover:bg-red-600 block w-full"
      >
        Logout
      </button>
    );
  }

  // Otherwise show login/signup links
  return (
    <div className={isVertical ? "flex flex-col gap-2" : "flex items-center gap-2"}>
      {links.map((link) => {
        const redirectParam = `?redirect=${encodeURIComponent(pathname)}`;
        return (
          <Link
            key={link.path}
            href={`${link.path}${redirectParam}`}
            className={`text-sm font-medium px-4 py-1.5 rounded-md ${
              link.isHighlighted
                ? "bg-white text-black font-semibold hover:bg-gray-200"
                : "text-gray-200 hover:text-white"
            } block`}
          >
            {link.name}
          </Link>
        );
      })}
    </div>
  );
}
