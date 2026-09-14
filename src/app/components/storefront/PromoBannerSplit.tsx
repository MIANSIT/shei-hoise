import Image from "next/image";
import Link from "next/link";
import type { PromoBanner } from "@/lib/types/promoBanner";

interface PromoBannerSplitProps {
  banners: PromoBanner[];
}

/**
 * Admin-managed promo banners (e.g. "New Arrivals" / "Best Sellers") as a
 * pair of compact cards — image on top, text below (not overlaid), so this
 * reads as a small "card" like the rest of the homepage rather than a big
 * full-bleed hero-style banner. Shows only the first 2 active banners,
 * ordered by sort_order — a single banner still gets a full-width treatment
 * rather than an awkward half-empty row.
 */
export function PromoBannerSplit({ banners }: PromoBannerSplitProps) {
  const shown = banners.slice(0, 2);
  if (shown.length === 0) return null;

  return (
    <section className="pt-8 sm:pt-14 pb-10 sm:pb-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-5 sm:mb-9">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-stone-400 dark:text-gray-500 mb-1 sm:mb-1.5">
            Don&apos;t Miss Out
          </p>
          <h2 className="text-lg sm:text-[1.75rem] font-black text-stone-900 dark:text-white tracking-tight leading-none">
            Special Offers
          </h2>
        </div>

        <div
          className={`grid gap-4 sm:gap-5 max-w-3xl ${shown.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:max-w-sm"}`}
        >
          {shown.map((banner) => (
            <div
              key={banner.id}
              className="rounded-2xl overflow-hidden border border-border bg-card hover:shadow-md transition-shadow duration-300"
            >
              <div className="relative aspect-4/3">
                <Image
                  src={banner.image_url}
                  alt={banner.headline ?? ""}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 380px"
                />
              </div>

              {(banner.subtext || banner.headline || (banner.button_text && banner.button_link)) && (
                <div className="p-4 sm:p-5">
                  {banner.subtext && (
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {banner.subtext}
                    </p>
                  )}
                  {banner.headline && (
                    <h3 className="mt-1 text-base sm:text-lg font-bold text-foreground leading-snug">
                      {banner.headline}
                    </h3>
                  )}
                  {banner.button_text && banner.button_link && (
                    <Link
                      href={banner.button_link}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary-hover transition-colors"
                    >
                      {banner.button_text} →
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
