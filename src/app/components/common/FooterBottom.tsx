"use client";

import Link from "next/link";

type FooterBottomProps = {
  links: { label: string; href: string }[];
  brandName: string;
};

export default function FooterBottom({ links, brandName }: FooterBottomProps) {
  return (
    <div className="border-t border-border mt-8">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between text-xs text-muted-foreground">
        <p>© 2025 {brandName}. All rights reserved.</p>
        <div className="flex gap-4 mt-2 md:mt-0">
          {links.map((link) => (
            <Link 
              key={link.label} 
              href={link.href}
              className="hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}