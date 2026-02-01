import React from "react";
import { notFound } from "next/navigation";
import StoreHeader from "@/app/components/common/StoreHeader";
import StoreFooter from "@/app/components/common/storeFooter/StoreFooter";
import { footerContent } from "@/lib/store/footerContent";
import { getStoreBySlugFull } from "@/lib/queries/stores/getStoreBySlugFull";

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ store_slug: string }>;
}

export default async function StoreLayout({
  children,
  params,
}: StoreLayoutProps) {
  const { store_slug } = await params;

  if (!store_slug) return null;

  const storeData = await getStoreBySlugFull(store_slug);
  if (!storeData) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <StoreHeader storeSlug={store_slug} />
      <main className="grow">
        {React.cloneElement(children as React.ReactElement<{ store: typeof storeData }>, {
          store: storeData,
        })}
      </main>
      <StoreFooter
        storeLogo={storeData.logo_url}
        storeName={storeData.store_name}
        storeSlug={store_slug}
        brandName={footerContent.brand.name}
        bottomLinks={footerContent.bottomLinksStore(store_slug)}
        contactEmail={storeData.contact_email ?? undefined}
        contactPhone={storeData.contact_phone ?? undefined}
        contactAddress={storeData.business_address ?? undefined}
        aboutLink={`/${store_slug}/about-us`}
        socialLinks={{
          facebook: storeData.social?.facebook_link ?? undefined,
          instagram: storeData.social?.instagram_link ?? undefined,
          twitter: storeData.social?.twitter_link ?? undefined,
          youtube: storeData.social?.youtube_link ?? undefined,
        }}
      />
    </div>
  );
}
