"use client";

import { useState } from "react";
import LogoTitle from "../header/LogoTitle";
import NavMenu, { NavLink } from "../header/NavMenu";
import ShoppingCartIcon from "../cart/ShoppingCartIcon";
import CartSidebar from "../cart/CartSidebar";
import AuthButtons from "../header/AuthButtons";

export default function DesktopHeader() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Main navigation for users
  const mainLinks: NavLink[] = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: "Checkout", path: "/checkout" },
  ];

  // Auth links for users
  const authLinksUser: NavLink[] = [
    { name: "Log in", path: "/login" },
    { name: "Sign up", path: "/sign-up", isHighlighted: true },
  ];

  return (
    <>
      <header
        className="
          hidden md:flex fixed top-0 left-0 w-full h-16
          items-center justify-between px-8 z-50
          transition-colors duration-300
          bg-transparent backdrop-blur-md
        "
      >
        {/* Left side */}
        <div className="flex items-center gap-8">
          <LogoTitle showTitle={true} isAdmin={false} />
          <NavMenu links={mainLinks} />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-5">
          <ShoppingCartIcon onClick={() => setIsCartOpen(true)} />
          <AuthButtons links={authLinksUser} isAdminPanel={false} />
        </div>
      </header>

      {/* Page content wrapper */}
      <main className="pt-16">{/* Your page content */}</main>

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
