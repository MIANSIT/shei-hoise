"use client";

import LogoTitle from "../header/LogoTitle";
import NavMenu, { NavLink } from "../header/NavMenu";
import ThemeToggle from "../theme/ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslation } from "@/lib/hook/useTranslation";

export default function DesktopHeader() {
  const t = useTranslation();

  const mainLinks: NavLink[] = [
    { name: t.nav.home, path: "/" },
    { name: t.landing.requestDemo, path: "/#request-demo" },
  ];

  return (
    <>
      <header className='hidden md:flex fixed top-0 left-0 w-full h-16 items-center justify-between px-8 z-50 bg-transparent backdrop-blur-md'>
        {/* Left */}
        <div className='flex items-center gap-8'>
          <LogoTitle showTitle={false} />
          <NavMenu links={mainLinks} />
        </div>

        {/* Right */}
        <div className='flex items-center gap-5'>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className='pt-16' />
    </>
  );
}
