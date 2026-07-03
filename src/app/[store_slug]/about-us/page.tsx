// src/app/[store_slug]/about-us/page.tsx
import Image from "next/image";
import Link from "next/link";
import { MapPin, Mail, Phone, Facebook, Instagram, Twitter, Youtube, ShoppingBag } from "lucide-react";
import { getStoreBySlugFull } from "@/lib/queries/stores/getStoreBySlugFull";

interface AboutPageProps {
  params: Promise<{ store_slug: string }>;
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { store_slug } = await params;
  const store = await getStoreBySlugFull(store_slug);

  if (!store) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-foreground">Store not found</h1>
      </main>
    );
  }

  const storeName = store.store_name.toUpperCase();
  const hasBanner = !!store.banner_url;
  const hasContact = store.contact_email || store.contact_phone || store.business_address;
  const hasSocial =
    store.social?.facebook_link ||
    store.social?.instagram_link ||
    store.social?.twitter_link ||
    store.social?.youtube_link;

  return (
    <div className="min-h-screen bg-[#F8F8F6] dark:bg-gray-950">

      {/* ── Banner hero ── */}
      <section className="relative w-full">
        {hasBanner ? (
          <div
            className="relative w-full h-44 sm:h-60 md:h-auto overflow-hidden"
            style={{ aspectRatio: "4 / 1" }}
          >
            <Image
              src={store.banner_url!}
              alt={`${storeName} banner`}
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/10 to-black/70" />
          </div>
        ) : (
          <div className="w-full h-32 sm:h-44 bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900" />
        )}

        {/* Store identity bar — bottom of banner */}
        <div className={`${hasBanner ? "absolute bottom-0 inset-x-0" : "relative bg-gray-900"}`}>
          <div className={`max-w-4xl mx-auto px-5 sm:px-8 flex gap-3 sm:gap-4 ${hasBanner ? "pb-4 sm:pb-6 items-end" : "py-4 sm:py-6 items-center"}`}>
            {store.logo_url && (
              <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl mb-0.5">
                <Image
                  src={store.logo_url}
                  alt={storeName}
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-black tracking-widest leading-none text-white drop-shadow-md">
                {storeName}
              </h1>
              {store.short_description && (
                <p className="mt-1 text-xs sm:text-sm text-white/75 font-normal leading-snug drop-shadow-sm line-clamp-2 max-w-md">
                  {store.short_description}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-10">

        {/* About section */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500 mb-3">
            About Us
          </h2>
          {store.description ? (
            <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {store.description}
            </p>
          ) : (
            <p className="text-base text-gray-400 dark:text-gray-500 italic">
              No description available yet.
            </p>
          )}
        </section>

        {/* Contact + Social row */}
        {(hasContact || hasSocial) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Contact */}
            {hasContact && (
              <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500 mb-4">
                  Contact
                </h2>
                <ul className="space-y-3">
                  {store.contact_email && (
                    <li className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <a
                        href={`mailto:${store.contact_email}`}
                        className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors break-all"
                      >
                        {store.contact_email}
                      </a>
                    </li>
                  )}
                  {store.contact_phone && (
                    <li className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <a
                        href={`tel:${store.contact_phone}`}
                        className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        {store.contact_phone}
                      </a>
                    </li>
                  )}
                  {store.business_address && (
                    <li className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                        {store.business_address}
                      </span>
                    </li>
                  )}
                </ul>
              </section>
            )}

            {/* Social + CTA */}
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 flex flex-col justify-between gap-6">
              {hasSocial && (
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500 mb-4">
                    Follow Us
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {store.social?.facebook_link && (
                      <a
                        href={store.social.facebook_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
                      >
                        <Facebook className="h-3.5 w-3.5" /> Facebook
                      </a>
                    )}
                    {store.social?.instagram_link && (
                      <a
                        href={store.social.instagram_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-pink-900/20 dark:hover:text-pink-400 transition-colors"
                      >
                        <Instagram className="h-3.5 w-3.5" /> Instagram
                      </a>
                    )}
                    {store.social?.twitter_link && (
                      <a
                        href={store.social.twitter_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-sky-50 hover:text-sky-500 dark:hover:bg-sky-900/20 dark:hover:text-sky-400 transition-colors"
                      >
                        <Twitter className="h-3.5 w-3.5" /> Twitter
                      </a>
                    )}
                    {store.social?.youtube_link && (
                      <a
                        href={store.social.youtube_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                      >
                        <Youtube className="h-3.5 w-3.5" /> YouTube
                      </a>
                    )}
                  </div>
                </div>
              )}

              <Link
                href={`/${store_slug}/shop`}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold shadow-sm hover:bg-gray-700 dark:hover:bg-gray-100 active:scale-95 transition-all duration-200 w-full sm:w-auto"
              >
                <ShoppingBag className="h-4 w-4" />
                Shop Now
              </Link>
            </section>

          </div>
        )}

        {/* If no contact/social, still show CTA */}
        {!hasContact && !hasSocial && (
          <div className="flex justify-center">
            <Link
              href={`/${store_slug}/shop`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold shadow-sm hover:bg-gray-700 dark:hover:bg-gray-100 active:scale-95 transition-all duration-200"
            >
              <ShoppingBag className="h-4 w-4" />
              Shop Now
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
