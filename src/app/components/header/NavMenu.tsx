"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

export interface NavLink {
  name: string;
  path?: string;
  isHighlighted?: boolean;
  children?: {
    name: string;
    path: string;
  }[];
}

interface NavMenuProps {
  links: NavLink[];
}

export default function NavMenu({ links }: NavMenuProps) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-6">
      {links.map((link) => {
        const isActive = link.path && pathname === link.path;

        // 🔽 DROPDOWN ITEM
        if (link.children) {
          return (
            <div key={link.name} className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors  after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full
              after:bg-linear-to-r after:from-yellow-400 after:to-yellow-600
              after:scale-x-0 after:origin-left after:transition-transform after:duration-300
              hover:after:scale-x-100"
              >
                {link.name}
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* Dropdown */}
              <div
                className="absolute left-0 top-full mt-2 w-48 rounded-xl border bg-background shadow-lg
                              opacity-0 invisible group-hover:opacity-100 group-hover:visible
                              transition-all duration-200 "
              >
                {link.children.map((child) => {
                  const childActive = pathname === child.path;

                  return (
                    <Link
                      key={child.path}
                      href={child.path}
                      className={`block px-4 py-2 text-sm "
  ${childActive ? "bg-background font-medium" : "hover:bg-background"}
   hover:bg-popover-foreground hover:text-card `}
                    >
                      {child.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        }

        // 🔗 NORMAL LINK
        return (
          <Link
            key={link.path}
            href={link.path!}
            className={`relative text-sm font-medium transition-colors duration-300
              ${
                isActive
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }
              after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full
              after:bg-linear-to-r after:from-yellow-400 after:to-yellow-600
              after:scale-x-0 after:origin-left after:transition-transform after:duration-300
              hover:after:scale-x-100
              ${isActive ? "after:scale-x-100" : ""}`}
          >
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
}
