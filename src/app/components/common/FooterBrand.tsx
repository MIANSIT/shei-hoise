"use client";

import Link from "next/link";
import { Facebook, Instagram,Linkedin ,Twitter } from "lucide-react";

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
  bgColor?: string; // circle background
  textColor?: string; // icon color
};

export default function FooterBrand({ brand }: BrandProps) {
  const socialLinks: SocialLink[] = [
    {
      href: "https://www.facebook.com/bd.shei.hoise",
      icon: Facebook,
      label: "Facebook",
      bgColor: "#1877F2", // blue circle
      textColor: "#ffffff", // white icon
    },
    {
      href: "https://www.instagram.com/shei.hoise.bd",
      icon: Instagram,
      label: "Instagram",
      bgColor:
        "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)", // gradient circle
      textColor: "#ffffff", // white icon
    },
    // { href: "#", icon: Linkedin, label: "LinkedIn" },
    // { href: "#", icon: Twitter, label: "Twitter" },
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
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit our ${social.label} page`}
            >
              <span
                className="flex items-center justify-center h-10 w-10 rounded-full"
                style={{
                  background: social.bgColor,
                  color: social.textColor,
                }}
              >
                <IconComponent className="h-5 w-5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
