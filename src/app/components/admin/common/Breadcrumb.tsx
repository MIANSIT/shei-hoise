"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "@/lib/hook/useTranslation";

export default function Breadcrumb() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const t = useTranslation();

  const segments = pathname.split("/").filter(Boolean);
  const isDashboard = segments[0] === "dashboard";

  if (!isDashboard) return null;

  const translateSegment = (segment: string): string => {
    const map: Record<string, string> = {
      customers: t.admin.bcCustomers,
      "create-customer": t.admin.bcCreateCustomer,
      products: t.admin.bcProducts,
      "add-product": t.admin.bcAddProduct,
      "stocks-update": t.admin.bcStocksUpdate,
      category: t.admin.bcCategory,
      orders: t.admin.bcOrders,
      "create-order": t.admin.bcCreateOrder,
      "edit-order": t.admin.bcEditOrder,
      expense: t.admin.bcExpense,
      "shipping-Management": t.admin.bcShippingManagement,
      "pixel-analytics": t.admin.bcPixelAnalytics,
      "admin-profile": t.admin.bcAdminProfile,
    };
    return map[segment] ?? (segment.replace(/-/g, " ").charAt(0).toUpperCase() + segment.replace(/-/g, " ").slice(1));
  };

  const shouldCollapse = segments.length > 2;

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
                  {translateSegment(segments[segments.length - 1])}
                </span>
              </>
            ) : (
              <ol className="flex items-center flex-wrap gap-1">
                <li>
                  <Link
                    href="/dashboard"
                    className="flex items-center font-bold hover:text-gray-500 text-sm"
                  >
                    {t.admin.bcDashboard}
                  </Link>
                </li>
                {segments.map((segment, index) => {
                  if (index === 0) return null;

                  const href = "/" + segments.slice(0, index + 1).join("/");
                  const formatted = translateSegment(segment);
                  const isLast = index === segments.length - 1;

                  return (
                    <li key={href} className="flex items-center">
                      <span className="mx-1 text-gray-400 text-xs">/</span>
                      {isLast ? (
                        <span className="text-gray-500 text-sm">{formatted}</span>
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
          <ol className="flex items-center space-x-1 text-sm">
            <li>
              <Link
                href="/dashboard"
                className="flex items-center font-bold hover:text-gray-500"
              >
                {t.admin.bcDashboard}
              </Link>
            </li>
            {segments.map((segment, index) => {
              if (index === 0) return null;

              const href = "/" + segments.slice(0, index + 1).join("/");
              const formatted = translateSegment(segment);
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

      {/* Desktop Version */}
      <div className="hidden md:block">
        <ol className="flex items-center space-x-2 text-sm">
          <li>
            <Link
              href="/dashboard"
              className="flex items-center font-bold hover:text-gray-500"
            >
              {t.admin.bcDashboard}
            </Link>
          </li>
          {segments.map((segment, index) => {
            if (index === 0) return null;

            const href = "/" + segments.slice(0, index + 1).join("/");
            const formatted = translateSegment(segment);
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
