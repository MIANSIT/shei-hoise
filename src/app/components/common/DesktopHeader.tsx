"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ShoppingCartIcon from "./ShoppingCartIcon";
import CartSidebar from "../cart/CartSidebar";

interface NavLink {
  name: string;
  path: string;
  isHighlighted?: boolean;
}

export default function DesktopHeader() {
  const pathname = usePathname();
  const [isCartOpen, setIsCartOpen] = useState(false);

  const navLinks: NavLink[] = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: "Checkout", path: "/checkout" },
    { name: "Log in", path: "/login" },
    { name: "Sign up", path: "/sign-up", isHighlighted: true },
  ];

  // Check if current page is an auth page
  const isAuthPage = pathname === "/login" || pathname === "/sign-up";

  return (
    <>
      {/* Sticky Header */}
      <header className="hidden md:block sticky top-0 left-0 w-full text-white z-50 bg-transparent backdrop-blur-md">
        <div className="flex items-center justify-between px-8 py-4">
          {/* Logo + Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center">
              <Image
                src='/logo.png'
                alt='Shei Hoise Logo'
                width={32}
                height={32}
                priority
              />
            </Link>

            <nav className="flex items-center gap-6">
              {navLinks.slice(0, 3).map((link) => {
                const isActive = pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={`relative text-sm font-medium transition-colors duration-300 
                      ${isActive ? "text-white font-semibold" : "text-gray-200 hover:text-white"}
                      after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full
                      after:bg-gradient-to-r after:from-yellow-400 after:to-yellow-600
                      after:scale-x-0 after:origin-left after:transition-transform after:duration-300
                      hover:after:scale-x-100
                      ${isActive ? "after:scale-x-100" : ""}
                    `}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Cart + Auth Links */}
          <div className="flex items-center gap-5">
            <ShoppingCartIcon onClick={() => setIsCartOpen(true)} />
            {navLinks.slice(3).map((link) => {
              // If we're on an auth page, redirect to home after login/signup
              // Otherwise, redirect back to the current page
              const redirectTo = isAuthPage ? "/" : pathname;
              const redirectParam = `?redirect=${encodeURIComponent(redirectTo)}`;
              
              return (
                <Link
                  key={link.path}
                  href={`${link.path}${redirectParam}`}
                  className={`text-sm font-medium ${
                    link.isHighlighted
                      ? "px-4 py-1.5 rounded-md bg-white text-black font-semibold hover:bg-gray-200"
                      : "text-gray-200 hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Cart Sidebar */}
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}