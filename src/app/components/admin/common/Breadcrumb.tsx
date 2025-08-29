"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Breadcrumb() {
  const pathname = usePathname();

  // Split path into segments (remove empty ones)
  const segments = pathname.split("/").filter(Boolean);

  // Only render breadcrumb if inside dashboard
  const isDashboard = segments[0] === "dashboard";

  if (!isDashboard) return null; // Do not render for non-dashboard pages

  return (
    <nav aria-label="Breadcrumb" className="mb-4 ml-4">
      <ol className="flex items-center space-x-2 text-sm text-white">
        {/* Root breadcrumb (Dashboard) */}
        <li>
          <Link
            href="/dashboard"
            className="flex items-center text-white hover:text-gray-500"
          >
            Dashboard
          </Link>
        </li>

        {/* Other segments */}
        {segments.map((segment, index) => {
          if (index === 0) return null; // skip "dashboard" since it's root

          const href = "/" + segments.slice(0, index + 1).join("/");

          const label = segment.replace(/-/g, " ");
          const formatted = label.charAt(0).toUpperCase() + label.slice(1);

          const isLast = index === segments.length - 1;

          return (
            <li key={href} className="flex items-center">
              <span className="mx-2 text-gray-400">/</span>
              {isLast ? (
                <span className="text-gray-500">{formatted}</span>
              ) : (
                <Link
                  href={href}
                  className="text-white hover:text-gray-500"
                >
                  {formatted}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
