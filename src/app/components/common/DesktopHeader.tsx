"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ShoppingCartIcon from "./ShoppingCartIcon";

interface NavLink {
  name: string;
  path: string;
  isHighlighted?: boolean;
}

export default function DesktopHeader() {
  const pathname = usePathname();

  const navLinks: NavLink[] = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: "Products", path: "/products" },
    { name: "Log in", path: "/login" },
    { name: "Sign up", path: "/signup", isHighlighted: true },
  ];

  return (
    <header className="hidden lg:block w-full bg-black text-white shadow-md">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Shei Hoise Logo"
              width={32}
              height={32}
              priority
            />
          </Link>
          <nav className="flex items-center gap-6">
            {navLinks.slice(0, 3).map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`text-sm font-medium transition-colors ${
                  pathname === link.path
                    ? "text-white font-semibold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-5">
           <ShoppingCartIcon />
          {navLinks.slice(3).map((link) => (
            <Link
              key={link.path}
              href={link.path}
              className={`text-sm font-medium ${
                link.isHighlighted
                  ? "px-4 py-1.5 rounded-md bg-white text-black font-semibold hover:bg-gray-200"
                  : "text-gray-200 hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}