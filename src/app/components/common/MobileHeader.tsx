"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoTitle from "../header/LogoTitle";
import { NavLink } from "../header/NavMenu";
import ThemeToggle from "../theme/ThemeToggle";
import { HiOutlineMenu, HiOutlineX, HiChevronDown } from "react-icons/hi";

export default function MobileHeader() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false); // Sections dropdown
  const pathname = usePathname();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const navLinks: NavLink[] = [
    { name: "Home", path: "/" },
    // Only show Sections on the home page
    // ...(pathname === "/"
    //   ? [
    //       {
    //         name: "Sections",
    //         children: [
    //           { name: "Store", path: "#stores" },
    //           { name: "Request Demo", path: "#request-demo" },
    //         ],
    //       },
    //     ]
    //   : []),
    { name: "Request Demo", path: "/#request-demo" },

    // { name: "All Stores", path: "/stores" },
  ];

  return (
    <>
      <header className="bg-background/80 backdrop-blur-md px-4  shadow-lg lg:hidden fixed top-0 left-0 w-full z-50 transition-all">
        <div className="flex items-center justify-between">
          <LogoTitle showTitle={true} />

          <div className="flex items-center gap-2">
            <ThemeToggle />

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
          className={`overflow-hidden transition-all duration-300 ease-in-out mt-2 rounded-md bg-background ${
            menuOpen ? "max-h-125 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <ul className="p-3 space-y-2">
            {navLinks.map((link) => {
              // Normal link
              if (!link.children) {
                const isActive = isHydrated && pathname === link.path;
                return (
                  <li key={link.path}>
                    <Link
                      href={link.path!}
                      onClick={() => setMenuOpen(false)}
                      className={`block py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200
                        ${
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground hover:bg-accent"
                        }
                      `}
                    >
                      {link.name}
                    </Link>
                  </li>
                );
              }

              // Dropdown section
              const isSectionActive = link.children.some(
                (child) => child.path === pathname,
              );

              return (
                <li key={link.name}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className={`w-full flex justify-between items-center py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200
                      ${
                        isSectionActive
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-accent"
                      }
                    `}
                  >
                    {link.name}
                    <HiChevronDown
                      className={`ml-2 transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown items */}
                  <ul
                    className={`pl-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${
                      dropdownOpen
                        ? "max-h-96 opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    {link.children.map((child) => {
                      const childActive = isHydrated && pathname === child.path;
                      return (
                        <li key={child.path}>
                          <Link
                            href={child.path}
                            onClick={() => {
                              setMenuOpen(false);
                              setDropdownOpen(false);
                            }}
                            className={`block py-2 px-3 rounded-md text-sm transition-colors duration-200
                              ${
                                childActive
                                  ? "font-medium text-foreground"
                                  : "text-foreground"
                              }
                              hover:bg-background/80 hover:text-foreground
                            `}
                          >
                            {child.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* Spacer so content is not hidden behind fixed header */}
      <div className="h-15 lg:hidden" />
    </>
  );
}
