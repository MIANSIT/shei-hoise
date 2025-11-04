"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { NavLink } from "../header/NavMenu";
import ThemeToggle from "../theme/ThemeToggle";
import ShoppingCartIcon from "../cart/ShoppingCartIcon";
import CartBottomBar from "../cart/CartBottomBar";
import StoreLogoTitle from "../header/StoreLogoTitle";
import UserDropdownMobile from "./UserDropdownMobile";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { getStoreBySlugWithLogo, StoreWithLogo } from "@/lib/queries/stores/getStoreBySlugWithLogo";
import AuthButtons from "../header/AuthButtons";

interface MobileHeaderProps {
  storeSlug: string;
  isAdmin?: boolean;
}

export default function MobileHeader({
  storeSlug,
  isAdmin = false,
}: MobileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [store, setStore] = useState<StoreWithLogo | null>(null);

  const { user } = useCurrentUser();
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

  return (
    <>
      <header className="bg-background px-4 py-3 shadow-md lg:hidden fixed top-0 left-0 w-full z-50">
        <div className="flex items-center justify-between">
          <StoreLogoTitle
            storeSlug={storeSlug}
            storeName={store?.store_name}
            logoUrl={store?.logo_url}
            showTitle={true}
          />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ShoppingCartIcon onClick={() => setIsCartOpen(true)} />
            <button
              className="text-foreground hover:bg-accent p-2 rounded-md"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <HiOutlineX size={18} /> : <HiOutlineMenu size={18} />}
            </button>
          </div>
        </div>

        <nav
          className={`overflow-hidden transition-all duration-300 ease-in-out bg-background ${
            menuOpen ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"
          }`}
        >
          <ul className="space-y-2 p-3">
            {navLinks.map((link) => {
              const isActive = isHydrated && pathname === link.path;
              return (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    className={`block py-2 px-3 rounded-md transition-colors duration-200 text-left text-sm ${
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-accent"
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                </li>
              );
            })}

            {user && (
              <>
                <li>
                  <div className="border-t border-border my-2" />
                </li>
                <li>
                  <UserDropdownMobile />
                </li>
              </>
            )}

            {!user && (
              <>
                <li>
                  <div className="border-t border-border my-2" />
                </li>
                <li>
                  <AuthButtons
                    links={[
                      { name: "Log in", path: "/login" },
                      { name: "Sign up", path: "/sign-up", isHighlighted: true },
                    ]}
                    isVertical={true}
                    isAdminPanel={false}
                  />
                </li>
              </>
            )}
          </ul>
        </nav>
      </header>

      <div className="h-[60px] lg:hidden" />
      <CartBottomBar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
