// src/app/[store_slug]/about-us/page.tsx
import { getStoreBySlugFull } from "@/lib/queries/stores/getStoreBySlugFull";

interface AboutPageProps {
  params: Promise<{
    store_slug: string;
  }>;
}

export default async function AboutPage({ params }: AboutPageProps) {
  // Get the slug from params
  const { store_slug } = await params;

  // Fetch store data using the slug
  const store = await getStoreBySlugFull(store_slug);

  if (!store) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-foreground">
          Store not found
        </h1>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">
        About {store.store_name}
      </h1>

      {store.description ? (
        <p className="text-base text-muted-foreground">{store.description}</p>
      ) : (
        <p className="text-base text-muted-foreground italic">
          No description available.
        </p>
      )}
    </main>
  );
}
