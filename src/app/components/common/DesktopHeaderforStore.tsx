"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import StoreLogoTitle from "../header/StoreLogoTitle";
import { NavLink } from "../header/NavMenu";
import AuthButtons from "../header/AuthButtons";
import ThemeToggle from "../theme/ThemeToggle";
import ShoppingCartIcon from "../cart/ShoppingCartIcon";
import CartSidebar from "../cart/CartSidebar";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import {
  getStoreBySlugWithLogo,
  StoreWithLogo,
} from "@/lib/queries/stores/getStoreBySlugWithLogo";

interface DesktopHeaderProps {
  storeSlug: string;
  isAdmin?: boolean;
}

export default function DesktopHeader({
  storeSlug,
  isAdmin = false,
}: DesktopHeaderProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [store, setStore] = useState<StoreWithLogo | null>(null);

  const { user, loading } = useCurrentUser();
  const pathname = usePathname();

  useEffect(() => {
    setIsHydrated(true);

    async function fetchStore() {
      const storeData = await getStoreBySlugWithLogo(storeSlug);
      setStore(storeData);
    }

    fetchStore();
  }, [storeSlug]);

  const navLinks: NavLink[] = [
    { name: "Shop", path: `/${storeSlug}` },
    { name: "Generate Order", path: `/${storeSlug}/generate-orders-link` },
  ];

  const authLinks: NavLink[] =
    !isAdmin && user
      ? [
          {
            name: user.first_name || "Profile",
            path: "/profile",
            isHighlighted: true,
          },
        ]
      : !isAdmin
      ? [
          { name: "Log in", path: "/login" },
          { name: "Sign up", path: "/sign-up", isHighlighted: true },
        ]
      : [];

  return (
    <>
      <header className="hidden md:flex fixed top-0 left-0 w-full h-16 items-center justify-between px-8 z-50 bg-transparent backdrop-blur-md">
        <div className="flex items-center gap-8">
          <StoreLogoTitle
            storeSlug={storeSlug}
            storeName={store?.store_name}
            logoUrl={store?.logo_url}
            showTitle={true}
          />
          <div className="flex gap-4">
            {navLinks.map((link) => {
              const isActive = isHydrated && pathname === link.path;
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-5">
          <ThemeToggle />
          <ShoppingCartIcon onClick={() => setIsCartOpen(true)} />
          {!loading && authLinks.length > 0 && (
            <AuthButtons links={authLinks} isAdminPanel={false} />
          )}
        </div>
      </header>

      <div className="h-[64px] hidden md:block" />
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
