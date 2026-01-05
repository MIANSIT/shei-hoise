"use client";

import LogoTitle from "../header/LogoTitle";
import NavMenu, { NavLink } from "../header/NavMenu";
import ThemeToggle from "../theme/ThemeToggle";

export default function DesktopHeader() {
  const mainLinks: NavLink[] = [
    { name: "Home", path: "/" },
    {
      name: "Sections",
      children: [
        { name: "Store", path: "/#stores" },
        { name: "Request Demo", path: "/#request-demo" },
      ],
    },
    { name: "All Stores", path: "/stores" },

    // 🔽 New dropdown section
  ];

  return (
    <>
      <header className="hidden md:flex fixed top-0 left-0 w-full h-16 items-center justify-between px-8 z-50 bg-transparent backdrop-blur-md">
        {/* Left */}
        <div className="flex items-center gap-8">
          <LogoTitle showTitle={false} />
          <NavMenu links={mainLinks} />
        </div>

        {/* Right */}
        <div className="flex items-center gap-5">
          <ThemeToggle />
        </div>
      </header>

      <main className="pt-16" />
    </>
  );
}
