import React from "react";
import StoreHeader from "@/app/components/common/StoreHeader";
import Footer from "@/app/components/common/Footer";

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    store_slug: string;
  }>;
}

export default async function StoreLayout({
  children,
  params,
}: StoreLayoutProps) {
  // Await the params
  const { store_slug } = await params;

  // Safety check
  if (!store_slug) return null;

  return (
    <>
      {/* Pass storeSlug to header */}
      <StoreHeader storeSlug={store_slug} />

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <Footer />
    </>
  );
}
