"use client";

import MobileHeader from "./MobileHeader";
import DesktopHeader from "./DesktopHeader";

interface HeaderProps {
  isAdmin?: boolean;
}

export default function Header({ isAdmin = false }: HeaderProps) {
  return (
    <>
      <div className="block md:hidden">
        <MobileHeader  />
      </div>
      <div className="hidden md:block">
        <DesktopHeader isAdmin={isAdmin} />
      </div>
    </>
  );
}
