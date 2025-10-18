"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ShoppingCartIcon from "../cart/ShoppingCartIcon";
import CartBottomBar from "../cart/CartBottomBar";
import { usePathname } from "next/navigation";
import LogoTitle from "../header/LogoTitle";
import { NavLink } from "../header/NavMenu";
import AuthButtons from "../header/AuthButtons";
import ThemeToggle from "../theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";

export default function MobileHeader() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const navLinks: NavLink[] = [
    { name: "Home", path: "/" },
    { name: "Checkout", path: "/checkout" },
  ];

  const authLinksUser: NavLink[] = [
    { name: "Log in", path: "/login" },
    { name: "Sign up", path: "/sign-up", isHighlighted: true },
  ];

  return (
    <>
      <header className="bg-background px-4 py-3 shadow-md lg:hidden fixed top-0 left-0 w-full z-50">
        <div className="flex items-center justify-between">
          <LogoTitle showTitle={true} />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ShoppingCartIcon onClick={() => setIsCartOpen(true)} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="text-foreground hover:bg-accent"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? (
                <HiOutlineX size={18} />
              ) : (
                <HiOutlineMenu size={18} />
              )}
            </Button>
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

            <li>
              <div className="border-t border-border my-2" />
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
      </header>

      <div className="h-[60px] lg:hidden" />
      <CartBottomBar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}