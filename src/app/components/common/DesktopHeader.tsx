"use client";

import LogoTitle from "../header/LogoTitle";
import NavMenu, { NavLink } from "../header/NavMenu";
import AuthButtons from "../header/AuthButtons";
import ThemeToggle from "../theme/ThemeToggle";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import UserDropdown from "./UserDropdownDesktop"; // adjust path

export default function DesktopHeader() {
  const { user, loading } = useCurrentUser();

  // Main navigation
  const mainLinks: NavLink[] = [
    { name: "Home", path: "/" },
    { name: "Stores", path: "/#stores" },
  ];

  // Auth links for non-logged-in users
  const authLinksUser: NavLink[] = [
    { name: "Log in", path: "/login" },
    { name: "Sign up", path: "/sign-up", isHighlighted: true },
  ];

  // Dropdown menu for logged-in user

  return (
    <>
      <header className="hidden md:flex fixed top-0 left-0 w-full h-16 items-center justify-between px-8 z-50 bg-transparent backdrop-blur-md">
        {/* Left side */}
        <div className="flex items-center gap-8">
          <LogoTitle showTitle={false} />
          <NavMenu links={mainLinks} />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-5">
          <ThemeToggle />

          {!loading && user ? (
            <UserDropdown />
          ) : (
            <AuthButtons links={authLinksUser} isAdminPanel={false} />
          )}
        </div>
      </header>

      {/* Spacer to avoid content behind fixed header */}
      <main className="pt-16">{/* Your page content */}</main>
    </>
  );
}
