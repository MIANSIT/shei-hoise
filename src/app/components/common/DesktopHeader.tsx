"use client";

import { useState, useEffect } from "react";
import LogoTitle from "../header/LogoTitle";
import NavMenu, { NavLink } from "../header/NavMenu";
import ShoppingCartIcon from "../cart/ShoppingCartIcon";
import CartSidebar from "../cart/CartSidebar";
import AuthButtons from "../header/AuthButtons";
import { FiSun, FiMoon } from "react-icons/fi";
import { Button } from "@/components/ui/button"; // Import shadcn/ui button

export default function DesktopHeader() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check if dark mode is enabled in localStorage or system preference
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const initialDarkMode = savedTheme === "dark" || (!savedTheme && systemPrefersDark);
    setIsDarkMode(initialDarkMode);
    
    if (initialDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

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
          <LogoTitle showTitle={false} />
          <NavMenu links={mainLinks} />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
          </Button>
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