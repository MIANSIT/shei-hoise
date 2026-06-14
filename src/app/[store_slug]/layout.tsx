import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 300; // cache store layout for 5 minutes on Vercel CDN
import StoreHeader from "@/app/components/common/StoreHeader";
import StoreFooter from "@/app/components/common/storeFooter/StoreFooter";
import { FacebookPixelScript } from "@/app/components/common/FacebookPixelScript";
import { footerContent } from "@/lib/store/footerContent";
import { getStoreBySlugFull } from "@/lib/queries/stores/getStoreBySlugFull";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ store_slug: string }>;
}): Promise<Metadata> {
  const { store_slug } = await params;
  const store = await getStoreBySlugFull(store_slug);

  if (!store) {
    return { title: "Store Not Found" };
  }

  const storeUrl = `${baseUrl}/${store_slug}`;

  return {
    title: {
      default: store.store_name,
      template: `%s | ${store.store_name}`,
    },
    description: store.description ?? `Shop at ${store.store_name} – browse our latest products.`,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: storeUrl,
    },
    openGraph: {
      title: store.store_name,
      description: store.description ?? `Shop at ${store.store_name}`,
      url: storeUrl,
      siteName: store.store_name,
      images: store.banner_url
        ? [{ url: store.banner_url, alt: store.store_name }]
        : store.logo_url
          ? [{ url: store.logo_url, alt: store.store_name }]
          : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: store.store_name,
      description: store.description ?? `Shop at ${store.store_name}`,
      images: store.banner_url ? [store.banner_url] : store.logo_url ? [store.logo_url] : [],
    },
  };
}

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
      {storeData.facebook_pixel_id && (
        <FacebookPixelScript pixelId={storeData.facebook_pixel_id} storeSlug={store_slug} />
      )}
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
