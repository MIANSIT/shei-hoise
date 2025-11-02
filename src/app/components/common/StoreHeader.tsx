import MobileHeader from "./MobileHeaderforStore";
import DesktopHeader from "./DesktopHeaderforStore";

interface StoreHeaderProps {
  storeSlug: string;
  isAdmin?: boolean;
}

export default function StoreHeader({
  storeSlug,
  isAdmin = false,
}: StoreHeaderProps) {
  return (
    <>
      <MobileHeader storeSlug={storeSlug} isAdmin={isAdmin} />
      <DesktopHeader storeSlug={storeSlug} isAdmin={isAdmin} />
    </>
  );
}
