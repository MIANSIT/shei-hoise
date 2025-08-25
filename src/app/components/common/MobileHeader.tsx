"use client";

import { useState, useEffect } from "react";
import ShoppingCartIcon from "./ShoppingCartIcon";
import CartBottomBar from "../cart/CartBottomBar";
import { usePathname, useRouter } from "next/navigation";
import LogoTitle from "../header/LogoTitle";
import { NavLink } from "../header/NavMenu";
import AuthButtons from "../header/AuthButtons";
import { useAuthStore } from "@/lib/store/authStore";

interface MobileHeaderProps {
  isAdmin?: boolean;
  onSidebarToggle?: () => void; // optional sidebar toggle callback
}

export default function MobileHeader({ isAdmin = false, onSidebarToggle }: MobileHeaderProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isAdminLoggedIn, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => setIsHydrated(true), []);

  const handleLogout = () => {
    logout();
    router.push("/admin-login");
  };

  const navLinks: NavLink[] = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: "Checkout", path: "/checkout" },
  ];

  const authLinksUser: NavLink[] = [
    { name: "Log in", path: "/login" },
    { name: "Sign up", path: "/sign-up", isHighlighted: true },
  ];

  return (
    <>
      <header className="bg-black px-4 py-3 shadow-md lg:hidden fixed top-0 left-0 w-full z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Admin: hamburger for sidebar */}
            {isAdmin && (
              <button
                onClick={onSidebarToggle}
                aria-label="Toggle sidebar"
                className="text-white focus:outline-none cursor-pointer text-sm"
              >
                <span>&#9776;</span>
              </button>
            )}
            <LogoTitle showTitle={isAdmin} isAdmin={isAdmin} />
          </div>

          <div className="flex items-center gap-3">
            {/* Cart for users */}
            {!isAdmin && <ShoppingCartIcon onClick={() => setIsCartOpen(true)} />}

            {/* Admin: logout button */}
            {isAdmin && isAdminLoggedIn && (
              <button
                onClick={handleLogout}
                className="px-4 py-1.5 rounded-md bg-red-500 text-white font-semibold hover:bg-red-600"
              >
                Logout
              </button>
            )}

            {/* User: menu toggle */}
            {!isAdmin && (
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                className="text-white focus:outline-none cursor-pointer text-sm"
              >
                {menuOpen ? <span>&#x2715;</span> : <span>&#9776;</span>}
              </button>
            )}
          </div>
        </div>

        {/* Mobile nav menu for users */}
        {!isAdmin && (
          <nav
            className={`overflow-hidden transition-all duration-300 ease-in-out bg-black ${
              menuOpen ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"
            }`}
          >
            <ul className="space-y-2 p-3">
              {navLinks.map((link) => {
                const isActive = isHydrated && pathname === link.path;
                return (
                  <li key={link.path}>
                    <a
                      href={link.path}
                      className={`block py-2 px-3 rounded-md transition-colors duration-200 text-left text-sm ${
                        isActive ? "bg-gray-600 text-white" : "text-white hover:bg-gray-600"
                      }`}
                    >
                      {link.name}
                    </a>
                  </li>
                );
              })}

              <li>
                <div className="border-t border-white/20 my-2" />
              </li>

              <li>
                <AuthButtons
                  links={authLinksUser}
                  isAdminPanel={false}
                  isVertical={true}
                />
              </li>
            </ul>
          </nav>
        )}
      </header>

      <div className="h-[60px] lg:hidden" />
      {!isAdmin && <CartBottomBar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />}
    </>
  );
}
