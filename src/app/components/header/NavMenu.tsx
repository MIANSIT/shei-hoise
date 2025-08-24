"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavLink {
  name: string;
  path: string;
  isHighlighted?: boolean;
}

interface NavMenuProps {
  links: NavLink[];
}

export default function NavMenu({ links }: NavMenuProps) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-6">
      {links.map((link) => {
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
              ${isActive ? "after:scale-x-100" : ""}`}
          >
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
}
