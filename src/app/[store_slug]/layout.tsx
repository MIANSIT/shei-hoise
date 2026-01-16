import React from "react";
import StoreHeader from "@/app/components/common/StoreHeader";
import { footerContent } from "@/lib/store/footerContent";
import { getStoreBySlugWithLogo } from "@/lib/queries/stores/getStoreBySlugWithLogo";
import FooterBottom from "@/app/components/common/FooterBottom";

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
  const { store_slug } = await params;

  if (!store_slug) return null;

  // Fetch store data including logo
  const storeData = await getStoreBySlugWithLogo(store_slug);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Pass storeSlug to header */}
      <StoreHeader storeSlug={store_slug} />

      {/* Main content - this will grow to push footer to bottom */}
      <main className="grow">{children}</main>

      {/* Footer section at bottom */}
      <div className="mt-auto">
        <FooterBottom
          links={footerContent.bottomLinksStore(store_slug)}
          brandName={footerContent.brand.name} // Main owner name
          storeLogo={storeData?.logo_url} // Store logo
          storeName={storeData?.store_name} // Store name (optional)
          storeSlug={store_slug} // Pass storeSlug for the link
          storeDescription={storeData?.description ?? undefined}
          isStore={true}
        />
      </div>
    </div>
  );
}
