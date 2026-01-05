"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { NavLink } from "../header/NavMenu";
import ThemeToggle from "../theme/ThemeToggle";
import ShoppingCartIcon from "../cart/ShoppingCartIcon";
import CartBottomBar from "../cart/CartBottomBar";
import StoreLogoTitle from "../header/StoreLogoTitle";
import UserDropdownMobile from "./UserDropdownMobile";
import { useCurrentCustomer } from "@/lib/hook/useCurrentCustomer";
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
  isAdmin = false,
}: MobileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [store, setStore] = useState<StoreWithLogo | null>(null);
  const [isStoreLoading, setIsStoreLoading] = useState(true);

  const {
    customer,
    loading: customerLoading,
    isLoggedIn,
    authEmail,
  } = useCurrentCustomer(storeSlug);

  const pathname = usePathname();
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

  // AuthLinks for mobile menu
  const authLinks: NavLink[] =
    !isAdmin && !isLoggedIn
      ? [
          {
            name: "Log in",
            path: `/${storeSlug}/login?redirect=/${storeSlug}`,
          },
          {
            name: "Sign up",
            path: `/${storeSlug}/signup?redirect=/${storeSlug}`,
            isHighlighted: true,
          },
        ]
      : [];

  // Get customer display name
  const customerDisplayName =
    customer?.name || authEmail?.split("@")[0] || "Customer";
  const customerDisplayEmail = customer?.email || authEmail || "";

  return (
    <>
      <header
        ref={menuRef}
        className="bg-background px-4 py-3 shadow-md lg:hidden fixed top-0 left-0 w-full z-50"
      >
        <div className="flex items-center justify-between">
          {/* Store Logo & Title */}
          {isStoreLoading ? (
            <div className="flex items-center gap-3">
              <SheiSkeleton className="w-8 h-8 rounded" />
              <SheiSkeleton className="w-32 h-6 rounded" />
            </div>
          ) : (
            <StoreLogoTitle
              storeSlug={storeSlug}
              storeName={store?.store_name}
              logoUrl={store?.logo_url}
              showTitle={true}
            />
          )}

          {/* Header Icons */}
          {customerLoading ? (
            <div className="flex items-center gap-2">
              <SheiSkeleton className="w-6 h-6 rounded" />
              <SheiSkeleton className="w-6 h-6 rounded" />
              <SheiSkeleton className="w-6 h-6 rounded" />
            </div>
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

        <div className="relative">
          <nav
            className={`transition-all duration-300 ease-in-out bg-background ${
              menuOpen
                ? "max-h-125 opacity-100 mt-2 overflow-visible"
                : "max-h-0 opacity-0 overflow-hidden"
            }`}
          >
            <ul
              className={`space-y-2 p-3 ${
                menuOpen ? "" : "pointer-events-none"
              }`}
            >
              {isStoreLoading ? (
                // Skeleton for nav
                <div className="space-y-2">
                  {[1, 2].map((item) => (
                    <SheiSkeleton
                      key={item}
                      className="w-full h-10 rounded-md"
                    />
                  ))}
                </div>
              ) : (
                <>
                  {navLinks.map((link) => {
                    const isActive = isHydrated && pathname === link.path;
                    if (!link.path) return null;

                    return (
                      <li key={link.path}>
                        <Link
                          href={link.path}
                          className={`block py-2 px-3 rounded-md transition-colors duration-200 text-left text-sm ${
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground hover:bg-accent"
                          } ${!menuOpen ? "pointer-events-none" : ""}`}
                          onClick={() => setMenuOpen(false)}
                          tabIndex={menuOpen ? 0 : -1}
                        >
                          {link.name}
                        </Link>
                      </li>
                    );
                  })}

                  {/* My Orders link for logged-in customers */}
                  {isLoggedIn && (
                    <li>
                      <Link
                        href={`/${storeSlug}/order-status`}
                        className={`block py-2 px-3 rounded-md transition-colors duration-200 text-left text-sm ${
                          pathname === `/${storeSlug}/order-status`
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground hover:bg-accent"
                        } ${!menuOpen ? "pointer-events-none" : ""}`}
                        onClick={() => setMenuOpen(false)}
                        tabIndex={menuOpen ? 0 : -1}
                      >
                        My Orders
                      </Link>
                    </li>
                  )}

                  {/* User Section */}
                  {customerLoading ? (
                    <>
                      <li>
                        <div className="border-t border-border my-2" />
                      </li>
                      <li>
                        <SheiSkeleton className="w-full h-10 rounded-md" />
                      </li>
                    </>
                  ) : isLoggedIn ? (
                    <>
                      <li>
                        <div className="border-t border-border my-2" />
                      </li>
                      <li
                        className={`${!menuOpen ? "pointer-events-none" : ""}`}
                      >
                        <UserDropdownMobile
                          customerName={customerDisplayName}
                          customerEmail={customerDisplayEmail}
                          storeSlug={storeSlug}
                        />
                      </li>
                    </>
                  ) : !isAdmin ? (
                    <>
                      <li>
                        <div className="border-t border-border my-2" />
                      </li>
                      <li
                        className={`${!menuOpen ? "pointer-events-none" : ""}`}
                      >
                        <AuthButtons
                          links={authLinks}
                          isVertical={true}
                          isAdminPanel={false}
                        />
                      </li>
                    </>
                  ) : null}
                </>
              )}
            </ul>
          </nav>
        </div>
      </header>

      <div className="h-15 lg:hidden" />
      <CartBottomBar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
