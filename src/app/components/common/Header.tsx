"use client";

import MobileHeader from "./MobileHeader";
import DesktopHeader from "./DesktopHeader";

interface HeaderProps {
  isAdmin?: boolean;
  onSidebarToggle?: () => void; // new prop for mobile admin
}

export default function Header({
  isAdmin = false,
  onSidebarToggle,
}: HeaderProps) {
  return (
    <>
      <div className='block md:hidden'>
        <MobileHeader />
      </div>
      <div className='hidden md:block'>
        <DesktopHeader />
      </div>
    </>
  );
}
