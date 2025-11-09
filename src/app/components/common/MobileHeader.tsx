"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
// import ShoppingCartIcon from "../cart/ShoppingCartIcon";
// import CartBottomBar from "../cart/CartBottomBar";
import { usePathname } from "next/navigation";
import LogoTitle from "../header/LogoTitle";
import { NavLink } from "../header/NavMenu";
// import AuthButtons from "../header/AuthButtons";
import ThemeToggle from "../theme/ThemeToggle";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
// import { useCurrentUser } from "@/lib/hook/useCurrentUser";
// import UserDropdownMobile from "./UserDropdownMobile";

export default function MobileHeader() {
  // const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  // const { user, loading } = useCurrentUser();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const navLinks: NavLink[] = [
    { name: "Home", path: "/" },
    { name: "Stores", path: "#stores" },
  ];

  // const authLinksUser: NavLink[] = [
  //   { name: "Log in", path: "/login" },
  //   { name: "Sign up", path: "/sign-up", isHighlighted: true },
  // ];

  return (
    <>
      <header className="bg-background/80 backdrop-blur-md px-4 py-3 shadow-lg lg:hidden fixed top-0 left-0 w-full z-50 transition-all">
        <div className="flex items-center justify-between">
          <LogoTitle showTitle={true} />

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* <ShoppingCartIcon onClick={() => setIsCartOpen(true)} /> */}

            <button
              className="text-foreground hover:bg-accent rounded-full p-1 transition"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? (
                <HiOutlineX size={22} />
              ) : (
                <HiOutlineMenu size={22} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <nav
          className={`overflow-hidden transition-all duration-300 ease-in-out bg-background rounded-md mt-2 ${
            menuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <ul className="space-y-2 p-3">
            {navLinks.map((link) => {
              const isActive = isHydrated && pathname === link.path;
              return (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    className={`block py-2 px-3 rounded-md transition-colors duration-200 text-sm font-medium ${
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

            {/* <li>
              <div className="border-t border-border my-2" />
            </li> */}

            {/* <li>
              {!loading && user ? (
                <UserDropdownMobile />
              ) : (
                <AuthButtons
                  links={authLinksUser}
                  isAdminPanel={false}
                  isVertical={true}
                />
              )}
            </li> */}
          </ul>
        </nav>
      </header>

      <div className="h-[60px] lg:hidden" />
      {/* <CartBottomBar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} /> */}
    </>
  );
}
