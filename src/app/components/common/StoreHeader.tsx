"use client";

import MobileHeader from "./MobileHeaderforStore";
import DesktopHeader from "./DesktopHeaderforStore";

interface HeaderProps {
  storeSlug: string; // ✅ required
  isAdmin?: boolean;
  onSidebarToggle?: () => void;
}

export default function StoreHeader({
  storeSlug,
  isAdmin = false,
  onSidebarToggle,
}: HeaderProps) {
  return (
    <>
      <div className="block md:hidden">
        <MobileHeader storeSlug={storeSlug} />
      </div>
      <div className="hidden md:block">
        <DesktopHeader storeSlug={storeSlug} />
      </div>
    </>
  );
}
