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
import { useCurrentCustomer } from "@/lib/hook/useCurrentCustomer"; // UPDATED IMPORT
import UserDropdown from "./UserDropdownDesktop";
import {
  getStoreBySlugWithLogo,
  StoreWithLogo,
} from "@/lib/queries/stores/getStoreBySlugWithLogo";
import { SheiSkeleton } from "../ui/shei-skeleton";

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
  const [isStoreLoading, setIsStoreLoading] = useState(true);

  // UPDATED: Use useCurrentCustomer instead of useCurrentUser
  const { 
    customer, 
    loading: customerLoading, 
    isLoggedIn, 
    authEmail 
  } = useCurrentCustomer(storeSlug);
  
  const pathname = usePathname();

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

  const navLinks: NavLink[] = [
    { name: "Shop", path: `/${storeSlug}` },
    { name: "Generate Order", path: `/${storeSlug}/generate-orders-link` },
  ];

  // AuthLinks for non-logged-in customers
  const authLinks: NavLink[] =
    !isAdmin && !isLoggedIn
      ? [
          { name: "Log in", path: `/login?redirect=/${storeSlug}` },
          { name: "Sign up", path: `/sign-up?redirect=/${storeSlug}`, isHighlighted: true },
        ]
      : [];

  // Skeleton for store logo/title
  const StoreLogoSkeleton = () => (
    <div className="flex items-center gap-3">
      <SheiSkeleton className="w-8 h-8 rounded" />
      <SheiSkeleton className="w-32 h-6 rounded" />
    </div>
  );

  // Skeleton for navigation links
  const NavLinksSkeleton = () => (
    <div className="flex gap-4">
      {[1, 2].map((item) => (
        <SheiSkeleton key={item} className="w-20 h-10 rounded-md" />
      ))}
    </div>
  );

  // Skeleton for user auth section
  const UserAuthSkeleton = () => (
    <div className="flex items-center gap-5">
      <SheiSkeleton className="w-6 h-6 rounded" />
      <SheiSkeleton className="w-6 h-6 rounded" />
      <div className="flex gap-2">
        <SheiSkeleton className="w-16 h-10 rounded-md" />
        <SheiSkeleton className="w-16 h-10 rounded-md" />
      </div>
    </div>
  );

  // Determine if we should show customer dropdown or auth buttons
  const showCustomerDropdown = isLoggedIn && customer;
  
  // Get customer name for display (fallback to email)
  const customerDisplayName = customer?.name || customer?.email?.split('@')[0] || "Customer";

  return (
    <>
      <header className="hidden md:flex fixed top-0 left-0 w-full h-16 items-center justify-between px-8 z-50 bg-transparent backdrop-blur-md">
        <div className="flex items-center gap-8">
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

          {/* Navigation Links - Show skeleton while loading */}
          {isStoreLoading ? (
            <NavLinksSkeleton />
          ) : (
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
              
              {/* Show My Orders link for logged-in customers */}
              {isLoggedIn && (
                <Link
                  href={`/${storeSlug}/order-status`}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    pathname === `/${storeSlug}/order-status`
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  My Orders
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-5">
          {/* Show skeleton for entire right section while customer data is loading */}
          {customerLoading ? (
            <UserAuthSkeleton />
          ) : (
            <>
              <ThemeToggle />
              <ShoppingCartIcon onClick={() => setIsCartOpen(true)} />

              {showCustomerDropdown ? (
                <UserDropdown 
                  customerName={customerDisplayName}
                  customerEmail={customer?.email || authEmail || ""}
                  storeSlug={storeSlug}
                />
              ) : (
                <AuthButtons links={authLinks} isAdminPanel={false} />
              )}
            </>
          )}
        </div>
      </header>

      {/* Spacer to prevent content being hidden behind fixed header */}
      <div className="h-[64px] hidden lg:block" />
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}