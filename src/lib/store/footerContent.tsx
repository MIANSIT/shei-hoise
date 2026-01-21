export const footerContent = {
  brand: {
    name: "Shei Hoise ",
    description:
      "Your ultimate destination for cutting-edge tech. Trendy gadgets, smart devices, and must-have electronics—all in one place.",
  },
  links: {
    shop: [
      { label: "All Products", href: "#" },
      { label: "Audio", href: "#" },
      { label: "Wearables", href: "#" },
      { label: "Smartphones", href: "#" },
      { label: "Laptops", href: "#" },
    ],
    company: [
      { label: "About Us", href: "/about" },
      // { label: "Careers", href: "#" },
      // { label: "Blog", href: "#" },
      // { label: "Press", href: "#" },
      { label: "Contact", href: "/contact-us" },
    ],
    support: [
      { label: "Help Center", href: "/help-center" },
      // { label: "Shipping & Returns", href: "#" },
      // { label: "Warranty", href: "#" },
      // { label: "Privacy Policy", href: "#" },
      // { label: "Terms of Service", href: "#" },
    ],
  },
  bottomLinks: [
    { label: "Privacy & Policy", href: "/privacy-policy" },
    { label: "Terms & Condition", href: "/terms-and-conditions" },
    // { label: "Cookies", href: "#" },
    // { label: "Sitemap", href: "#" },
  ],
  bottomLinksStore: (store_slug: string) => [
    { label: "Privacy & Policy", href: `/${store_slug}/privacy-policy` },
    { label: "Terms & Condition", href: `/${store_slug}/terms-and-conditions` },
    // { label: "Cookies", href: "#" },
    // { label: "Sitemap", href: "#" },
  ],
};
