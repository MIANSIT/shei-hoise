"use client";

import { useState } from "react";
import LogoTitle from "../header/LogoTitle";
import NavMenu, { NavLink } from "../header/NavMenu";
import AuthButtons from "../header/AuthButtons";
import ShoppingCartIcon from "./ShoppingCartIcon";
import CartSidebar from "../cart/CartSidebar";

interface DesktopHeaderProps {
  isAdmin?: boolean;
}

export default function DesktopHeader({ isAdmin = false }: DesktopHeaderProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);

  const mainLinks: NavLink[] = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: "Checkout", path: "/checkout" },
  ];

  // Admin: only login and highlighted
  const authLinksAdmin: NavLink[] = [
    { name: "Log in", path: "/login", isHighlighted: true },
  ];

  // User: login normal, signup highlighted
  const authLinksUser: NavLink[] = [
    { name: "Log in", path: "/login" },
    { name: "Sign up", path: "/sign-up", isHighlighted: true },
  ];

  return (
    <>
      <header className="hidden md:flex sticky top-0 left-0 w-full items-center justify-between px-8 py-4 text-white z-50 bg-transparent backdrop-blur-md">
        {/* Left side */}
        <div className="flex items-center gap-8">
          <LogoTitle showTitle={isAdmin} isAdmin={isAdmin} />{" "}
          {/* Admin: logo+title, User: logo */}
          {!isAdmin && <NavMenu links={mainLinks} />}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-5">
          {!isAdmin && <ShoppingCartIcon onClick={() => setIsCartOpen(true)} />}
          <AuthButtons links={isAdmin ? authLinksAdmin : authLinksUser} />
        </div>
      </header>

      {!isAdmin && (
        <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      )}
    </>
  );
}
