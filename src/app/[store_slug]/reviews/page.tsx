// src/app/[store_slug]/reviews/page.tsx
import Image from "next/image";
import { getStoreBySlugFull } from "@/lib/queries/stores/getStoreBySlugFull";
import { getStoreRatingSummary } from "@/lib/queries/storeReviews/getStoreRatingSummary";
import { StoreReviewsSection } from "@/app/components/store/reviews/StoreReviewsSection";

interface StoreReviewsPageProps {
  params: Promise<{ store_slug: string }>;
}

export default async function StoreReviewsPage({ params }: StoreReviewsPageProps) {
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
  const ratingSummary = await getStoreRatingSummary(store.id);

  return (
    <div className="min-h-screen bg-[#F8F8F6] dark:bg-gray-950">
      <div className="bg-gray-900 dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-6 sm:py-8 flex items-center gap-3 sm:gap-4">
          {store.logo_url && (
            <div className="shrink-0 w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl">
              <Image
                src={store.logo_url}
                alt={storeName}
                width={56}
                height={56}
                className="object-cover w-full h-full"
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-white/50 mb-1">
              Reviews
            </p>
            <h1 className="text-lg sm:text-2xl font-black tracking-widest leading-none text-white truncate">
              {storeName}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <StoreReviewsSection
          storeId={store.id}
          storeSlug={store_slug}
          average={ratingSummary.average}
          total={ratingSummary.total}
        />
      </div>
    </div>
  );
}
