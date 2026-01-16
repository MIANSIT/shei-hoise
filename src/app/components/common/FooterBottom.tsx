"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

type FooterBottomProps = {
  links: { label: string; href: string }[];
  brandName: string;
  storeLogo?: string | null;
  storeName?: string;
  storeSlug?: string;
  storeDescription?: string;
  isStore?: boolean;
};

/* --- Smart label for URLs --- */
function getLinkLabel(url: string) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
  if (url.includes("facebook.com")) return "Facebook";
  if (url.includes("instagram.com")) return "Instagram";
  if (url.includes("tiktok.com")) return "TikTok";
  if (url.includes("twitter.com") || url.includes("x.com")) return "X";
  if (url.includes("linkedin.com")) return "LinkedIn";
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Visit link";
  }
}

function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary font-medium hover:underline underline-offset-4"
      >
        {getLinkLabel(part)} ↗
      </a>
    ) : (
      part
    )
  );
}

export default function FooterBottom({
  links,
  brandName,
  storeLogo,
  storeName,
  storeSlug,
  storeDescription,
  isStore = false,
}: FooterBottomProps) {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col items-center text-center gap-6">
        {/* ================= Store Info ================= */}
        {isStore && (storeLogo || storeName) && (
          <Link
            href={`/${storeSlug}`}
            className="flex items-center gap-3 mb-2 hover:opacity-80 transition-opacity"
          >
            {storeLogo && (
              <Image
                src={storeLogo}
                alt={storeName || brandName}
                width={36}
                height={36}
                className="w-9 h-9 object-contain"
              />
            )}
            {storeName && (
              <span className="text-lg font-semibold text-foreground">
                {storeName}
              </span>
            )}
          </Link>
        )}

        {/* Store Description */}
        {storeDescription && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl line-clamp-3">
            {linkify(storeDescription)}
          </p>
        )}

        {/* Footer Links */}
        <div className="flex flex-wrap justify-center gap-4 text-sm font-medium pt-3">
          {links.map((link, i) => (
            <React.Fragment key={link.label}>
              <Link
                href={link.href}
                className="hover:text-primary hover:underline underline-offset-4 transition-all"
              >
                {link.label}
              </Link>
              {i !== links.length - 1 && (
                <span className="text-muted-foreground">•</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Divider */}
        <div className="w-full border-t border-border mt-6" />

        {/* Copyright */}
        <p className="text-sm text-muted-foreground pt-4">
          © 2025{" "}
          <Link
            href="/"
            className="text-foreground font-medium hover:underline underline-offset-4"
          >
            {brandName}
          </Link>
          . All rights reserved.
        </p>
      </div>
    </footer>
  );
}
