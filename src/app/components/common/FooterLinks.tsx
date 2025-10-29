"use client";

import Link from "next/link";

type FooterLinksProps = {
  title: string;
  links: { label: string; href: string }[];
};

export default function FooterLinks({ title, links }: FooterLinksProps) {
  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3">{title}</h3>
      <ul className="space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.label}>
            <Link 
              href={link.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}