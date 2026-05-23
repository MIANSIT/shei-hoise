import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "All Stores | Shei Hoise",
  description:
    "Browse all active stores on Shei Hoise. Discover unique products from verified sellers across Bangladesh.",
  openGraph: {
    title: "All Stores | Shei Hoise",
    description: "Browse all active stores on Shei Hoise.",
    type: "website",
  },
};

export default function StoresLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
