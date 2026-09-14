import MobileHeader from "./MobileHeaderforStore";
import DesktopHeader from "./DesktopHeaderforStore";

interface StoreHeaderProps {
  storeSlug: string;
  isAdmin?: boolean;
  // Shifts the fixed header down below the AnnouncementBar (h-9) instead of
  // overlapping it — see the comment in AnnouncementBar.tsx.
  hasAnnouncement?: boolean;
}

export default function StoreHeader({
  storeSlug,
  isAdmin = false,
  hasAnnouncement = false,
}: StoreHeaderProps) {
  return (
    <>
      <MobileHeader storeSlug={storeSlug} isAdmin={isAdmin} hasAnnouncement={hasAnnouncement} />
      <DesktopHeader storeSlug={storeSlug} isAdmin={isAdmin} hasAnnouncement={hasAnnouncement} />
    </>
  );
}
