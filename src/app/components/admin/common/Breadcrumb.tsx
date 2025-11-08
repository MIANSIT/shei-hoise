"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Breadcrumb() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  // Split path into segments (remove empty ones)
  const segments = pathname.split("/").filter(Boolean);

  // Only render breadcrumb if inside dashboard
  const isDashboard = segments[0] === "dashboard";

  if (!isDashboard) return null; // Do not render for non-dashboard pages

  // For mobile: show only the last segment with a toggle
  const shouldCollapse = segments.length > 2; // Only collapse if we have more than dashboard + one segment

  // Handle toggle for mobile
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <nav aria-label="Breadcrumb" className="p-4">
      {/* Mobile Version */}
      <div className="block md:hidden">
        {shouldCollapse ? (
          <div className="flex items-center">
            {!isExpanded ? (
              // Collapsed state - show last item only with ellipsis
              <>
                <button
                  onClick={handleToggle}
                  className="flex items-center font-bold hover:text-gray-500 p-1 rounded"
                  aria-label="Show full breadcrumb"
                >
                  <span className="text-gray-400">⋯</span>
                  <span className="mx-2 text-gray-400">/</span>
                </button>
                <span className="text-gray-500">
                  {segments[segments.length - 1]
                    .replace(/-/g, " ")
                    .charAt(0)
                    .toUpperCase() +
                    segments[segments.length - 1].replace(/-/g, " ").slice(1)}
                </span>
              </>
            ) : (
              // Expanded state - show full breadcrumb
              <ol className="flex items-center flex-wrap gap-1">
                <li>
                  <Link
                    href="/dashboard"
                    className="flex items-center font-bold hover:text-gray-500 text-sm"
                  >
                    Dashboard
                  </Link>
                </li>
                {segments.map((segment, index) => {
                  if (index === 0) return null;

                  const href = "/" + segments.slice(0, index + 1).join("/");
                  const label = segment.replace(/-/g, " ");
                  const formatted =
                    label.charAt(0).toUpperCase() + label.slice(1);
                  const isLast = index === segments.length - 1;

                  return (
                    <li key={href} className="flex items-center">
                      <span className="mx-1 text-gray-400 text-xs">/</span>
                      {isLast ? (
                        <span className="text-gray-500 text-sm">
                          {formatted}
                        </span>
                      ) : (
                        <Link
                          href={href}
                          className="font-bold hover:text-gray-500 text-sm"
                          onClick={() => setIsExpanded(false)}
                        >
                          {formatted}
                        </Link>
                      )}
                    </li>
                  );
                })}
                <button
                  onClick={handleToggle}
                  className="ml-2 text-xs text-blue-500 hover:text-blue-700"
                  aria-label="Collapse breadcrumb"
                >
                  ▲
                </button>
              </ol>
            )}
          </div>
        ) : (
          // Regular mobile breadcrumb for short paths
          <ol className="flex items-center space-x-1 text-sm">
            <li>
              <Link
                href="/dashboard"
                className="flex items-center font-bold hover:text-gray-500"
              >
                Dashboard
              </Link>
            </li>
            {segments.map((segment, index) => {
              if (index === 0) return null;

              const href = "/" + segments.slice(0, index + 1).join("/");
              const label = segment.replace(/-/g, " ");
              const formatted = label.charAt(0).toUpperCase() + label.slice(1);
              const isLast = index === segments.length - 1;

              return (
                <li key={href} className="flex items-center">
                  <span className="mx-1 text-gray-400">/</span>
                  {isLast ? (
                    <span className="text-gray-500">{formatted}</span>
                  ) : (
                    <Link href={href} className="font-bold hover:text-gray-500">
                      {formatted}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Desktop Version (unchanged) */}
      <div className="hidden md:block">
        <ol className="flex items-center space-x-2 text-sm">
          <li>
            <Link
              href="/dashboard"
              className="flex items-center font-bold hover:text-gray-500"
            >
              Dashboard
            </Link>
          </li>
          {segments.map((segment, index) => {
            if (index === 0) return null;

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
                  <Link href={href} className="font-bold hover:text-gray-500">
                    {formatted}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
