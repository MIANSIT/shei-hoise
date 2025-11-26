"use client";

import Link from "next/link";
import Image from "next/image";

type FooterBottomProps = {
  links: { label: string; href: string }[];
  brandName: string;
  storeLogo?: string | null;
  storeName?: string;
  storeSlug?: string; // Make optional
  isStore?: boolean; // Add flag to identify if it's a store
};

export default function FooterBottom({
  links,
  brandName,
  storeLogo,
  storeName,
  storeSlug,
  isStore = false, // Default to false for main website
}: FooterBottomProps) {
  return (
    <div className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Desktop Layout */}
        <div className="hidden md:block">
          {isStore ? (
            // Store Layout
            <div className="flex flex-row justify-between items-center mb-6">
              {/* Left: Logo and Store Name */}
              <div className="flex items-center gap-3">
                {storeLogo ? (
                  <Link
                    href={`/${storeSlug}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <Image
                      src={storeLogo}
                      alt={storeName || brandName}
                      width={40}
                      height={40}
                      className="w-10 h-10 object-contain"
                    />
                    {storeName && (
                      <span className="text-base font-semibold text-foreground">
                        {storeName}
                      </span>
                    )}
                  </Link>
                ) : (
                  storeName && (
                    <Link
                      href={`/${storeSlug}`}
                      className="text-base font-semibold text-foreground hover:opacity-80 transition-opacity"
                    >
                      {storeName}
                    </Link>
                  )
                )}
              </div>

              {/* Right: Privacy & Terms Links */}
              <div className="flex gap-8">
                {links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm text-foreground font-medium hover:text-primary hover:underline underline-offset-4 transition-all duration-200"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            // Main Website Layout
            <div className="flex flex-row justify-between items-center">
              {/* Left: Copyright */}
              <p className="text-sm text-muted-foreground">
                © 2025{" "}
                <Link
                  href="/"
                  className="text-foreground font-medium hover:text-primary hover:underline underline-offset-4 transition-all duration-200"
                >
                  {brandName}
                </Link>
                . All rights reserved.
              </p>

              {/* Right: Links */}
              <div className="flex gap-8">
                {links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm text-foreground font-medium hover:text-primary hover:underline underline-offset-4 transition-all duration-200"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Store Copyright (only for stores) */}
          {isStore && (
            <div className="text-center border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                © 2025{" "}
                <Link
                  href="/"
                  className="text-foreground font-medium hover:text-primary hover:underline underline-offset-4 transition-all duration-200"
                >
                  {brandName}
                </Link>
                . All rights reserved.
              </p>
            </div>
          )}
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex flex-col items-center space-y-6">
          {isStore && (storeLogo || storeName) && (
            // Store Logo and Name (Mobile)
            <div className="text-center">
              {storeLogo && (
                <Link
                  href={`/${storeSlug}`}
                  className="flex items-center justify-center gap-3 mb-2"
                >
                  <Image
                    src={storeLogo}
                    alt={storeName || brandName}
                    width={40}
                    height={40}
                    className="w-10 h-10 object-contain"
                  />
                  {storeName && (
                    <span className="text-base font-semibold text-foreground">
                      {storeName}
                    </span>
                  )}
                </Link>
              )}
              {!storeLogo && storeName && (
                <Link
                  href={`/${storeSlug}`}
                  className="text-base font-semibold text-foreground hover:opacity-80 transition-opacity"
                >
                  {storeName}
                </Link>
              )}
            </div>
          )}

          {/* Links (Both store and main website) */}
          <div className="flex flex-col items-center space-y-3 w-full max-w-xs">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-foreground font-medium hover:text-primary hover:underline underline-offset-4 duration-200 py-2 px-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors w-full text-center border border-border"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Copyright (Both store and main website) */}
          <div className="text-center border-t border-border pt-4 w-full">
            <p className="text-sm text-muted-foreground">
              © 2025{" "}
              <Link
                href="/"
                className="text-foreground font-medium hover:text-primary hover:underline underline-offset-4 transition-all duration-200"
              >
                {brandName}
              </Link>
              . All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
