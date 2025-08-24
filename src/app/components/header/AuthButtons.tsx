"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLink } from "./NavMenu";

interface AuthButtonsProps {
  links: NavLink[];
}

export default function AuthButtons({ links }: AuthButtonsProps) {
  const pathname = usePathname();

  return (
    <>
      {links.map((link) => {
        const redirectParam = `?redirect=${encodeURIComponent(pathname)}`;
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
    </>
  );
}
