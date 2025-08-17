"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { FaBars, FaTimes } from "react-icons/fa";
import ShoppingCartIcon from "./ShoppingCartIcon";
import { usePathname } from "next/navigation";
import CartBottomBar from "../shop/CartBottomBar";
interface NavLink {
  name: string;
  path: string;
  isHighlighted?: boolean;
}

export default function MobileHeader() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const navLinks: NavLink[] = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: "Products", path: "/products" },
    { name: "Log in", path: "/login" },
    { name: "Sign up", path: "/sign-up", isHighlighted: true },
  ];

  return (
    <>
    <header className="bg-black px-4 py-3 shadow-md lg:hidden relative z-50">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Your Logo"
            width={32}
            height={32}
            priority
          />
        </Link>
        <div className="flex items-center gap-3">
          <ShoppingCartIcon onClick={() => setIsCartOpen(true)} />
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="text-white focus:outline-none cursor-pointer text-sm"
          >
            {menuOpen ? <FaTimes size={16} /> : <FaBars size={16} />}
          </button>
        </div>
      </div>
      <nav
        className={`overflow-hidden transition-all duration-300 ease-in-out bg-black ${
          menuOpen ? "max-h-70 opacity-100 mt-2" : "max-h-0 opacity-0"
        }`}
      >
        <ul className="space-y-2 p-3">
          {navLinks.map((link, index) => (
            <li key={link.path}>
              {index === 3 && (
                <div className="border-t border-white/20 my-2"></div>
              )}
              <Link
                href={link.path}
                className={`block py-2 px-3 rounded-md transition-colors duration-200 text-left text-sm ${
                  link.isHighlighted
                    ? "bg-white text-black hover:bg-gray-200 font-medium"
                    : isHydrated && pathname === link.path
                    ? "bg-gray-600 text-white"
                    : "text-white hover:bg-gray-600"
                } ${
                  link.isHighlighted &&
                  isHydrated &&
                  pathname === link.path
                    ? "bg-gray-300"
                    : ""
                }`}
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
    <CartBottomBar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}