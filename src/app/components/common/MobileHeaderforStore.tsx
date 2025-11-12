"use client";

import { useState, useEffect, useRef } from "react"; // Added useRef
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
import {
  getStoreBySlugWithLogo,
  StoreWithLogo,
} from "@/lib/queries/stores/getStoreBySlugWithLogo";
import AuthButtons from "../header/AuthButtons";
import { SheiSkeleton } from "../ui/shei-skeleton";

interface MobileHeaderProps {
  storeSlug: string;
  isAdmin?: boolean;
}

export default function MobileHeader({
  storeSlug,
}: // isAdmin = false,
MobileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [store, setStore] = useState<StoreWithLogo | null>(null);
  const [isStoreLoading, setIsStoreLoading] = useState(true);

  const { user, loading: userLoading } = useCurrentUser();
  const pathname = usePathname();

  // Ref for the mobile menu
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsHydrated(true);

    async function fetchStore() {
      try {
        setIsStoreLoading(true);
        const storeData = await getStoreBySlugWithLogo(storeSlug);
        setStore(storeData);
      } catch (error) {
        console.error("Failed to fetch store:", error);
        setStore(null);
      } finally {
        setIsStoreLoading(false);
      }
    }

    fetchStore();
  }, [storeSlug]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navLinks: NavLink[] = [
    { name: "Shop", path: `/${storeSlug}` },
    { name: "Generate Order", path: `/${storeSlug}/generate-orders-link` },
  ];

  // Skeleton for store logo/title
  const StoreLogoSkeleton = () => (
    <div className="flex items-center gap-3">
      <SheiSkeleton className="w-8 h-8 rounded" />
      <SheiSkeleton className="w-32 h-6 rounded" />
    </div>
  );

  // Skeleton for navigation menu items
  const NavMenuSkeleton = () => (
    <div className="space-y-2 p-3">
      {[1, 2].map((item) => (
        <SheiSkeleton key={item} className="w-full h-10 rounded-md" />
      ))}
      <div className="border-t border-border my-2" />
      <div className="flex flex-col gap-2">
        <SheiSkeleton className="w-full h-10 rounded-md" />
        <SheiSkeleton className="w-full h-10 rounded-md" />
      </div>
    </div>
  );

  // Skeleton for user section in mobile menu
  const UserSectionSkeleton = () => (
    <>
      <li>
        <div className="border-t border-border my-2" />
      </li>
      <li>
        <SheiSkeleton className="w-full h-10 rounded-md" />
      </li>
    </>
  );

  // Skeleton for header icons
  const HeaderIconsSkeleton = () => (
    <div className="flex items-center gap-2">
      <SheiSkeleton className="w-6 h-6 rounded" />
      <SheiSkeleton className="w-6 h-6 rounded" />
      <SheiSkeleton className="w-6 h-6 rounded" />
    </div>
  );

  return (
    <>
      <header
        ref={menuRef} // Added ref here
        className="bg-background px-4 py-3 shadow-md lg:hidden fixed top-0 left-0 w-full z-50"
      >
        <div className="flex items-center justify-between">
          {/* Store Logo & Title - Show skeleton while loading */}
          {isStoreLoading ? (
            <StoreLogoSkeleton />
          ) : (
            <StoreLogoTitle
              storeSlug={storeSlug}
              storeName={store?.store_name}
              logoUrl={store?.logo_url}
              showTitle={true}
            />
          )}

          {/* Header Icons - Show skeleton while user data is loading */}
          {userLoading ? (
            <HeaderIconsSkeleton />
          ) : (
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <ShoppingCartIcon onClick={() => setIsCartOpen(true)} />
              <button
                className="text-foreground hover:bg-accent p-2 rounded-md"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
              >
                {menuOpen ? (
                  <HiOutlineX size={18} />
                ) : (
                  <HiOutlineMenu size={18} />
                )}
              </button>
            </div>
          )}
        </div>

        <nav
          className={`overflow-hidden transition-all duration-300 ease-in-out bg-background ${
            menuOpen ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"
          }`}
        >
          <ul className="space-y-2 p-3">
            {/* Navigation Links - Show skeleton while store data is loading */}
            {isStoreLoading ? (
              <NavMenuSkeleton />
            ) : (
              <>
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

                {/* User Section - Show skeleton while user data is loading */}
                {userLoading ? (
                  <UserSectionSkeleton />
                ) : user ? (
                  <>
                    <li>
                      <div className="border-t border-border my-2" />
                    </li>
                    <li>
                      <UserDropdownMobile />
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <div className="border-t border-border my-2" />
                    </li>
                    <li>
                      <AuthButtons
                        links={[
                          { name: "Log in", path: "/login" },
                          {
                            name: "Sign up",
                            path: "/sign-up",
                            isHighlighted: true,
                          },
                        ]}
                        isVertical={true}
                        isAdminPanel={false}
                      />
                    </li>
                  </>
                )}
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
