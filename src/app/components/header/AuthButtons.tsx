"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NavLink } from "./NavMenu";
import { useAuthStore } from "@/lib/store/authStore";

interface AuthButtonsProps {
  links: NavLink[];
}

export default function AuthButtons({ links }: AuthButtonsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdminLoggedIn, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/admin-login");
  };

  if (isAdminLoggedIn) {
    // ✅ If logged in → show logout button
    return (
      <button
        onClick={handleLogout}
        className="px-4 py-1.5 rounded-md bg-red-500 text-white font-semibold hover:bg-red-600"
      >
        Logout
      </button>
    );
  }

  // ❌ If not logged in → show login & signup links
  return (
    <>
      {links.map((link) => {
        const redirectParam = `?redirect=${encodeURIComponent(pathname)}`;
        return (
          <Link
            key={link.path}
            href={`${link.path}${redirectParam}`}
            className={`text-sm font-medium ${
              link.isHighlighted
                ? "px-4 py-1.5 rounded-md bg-white text-black font-semibold hover:bg-gray-200"
                : "text-gray-200 hover:text-white"
            }`}
          >
            {link.name}
          </Link>
        );
      })}
    </>
  );
}
