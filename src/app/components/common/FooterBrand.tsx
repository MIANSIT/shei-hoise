"use client";

import Link from "next/link";
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

type BrandProps = {
  brand: {
    name: string;
    description: string;
  };
};

type SocialLink = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

export default function FooterBrand({ brand }: BrandProps) {
  const socialLinks: SocialLink[] = [
    { href: "#", icon: Facebook, label: "Facebook" },
    { href: "#", icon: Twitter, label: "Twitter" },
    { href: "#", icon: Instagram, label: "Instagram" },
    { href: "#", icon: Linkedin, label: "LinkedIn" },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">{brand.name}</h2>
      <p className="mt-3 text-sm text-muted-foreground">{brand.description}</p>
      <div className="flex gap-4 mt-4">
        {socialLinks.map((social, index) => {
          const IconComponent = social.icon;
          return (
            <Link 
              key={index} 
              href={social.href}
              aria-label={`Visit our ${social.label} page`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <IconComponent className="h-5 w-5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}