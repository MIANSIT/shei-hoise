import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { getStoreBySlugFull } from "@/lib/queries/stores/getStoreBySlugFull";
import ShopClient from "../../shop/ShopClient";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

interface CategoryPageProps {
  params: Promise<{ store_slug: string; category_slug: string }>;
}

interface CategorySeo {
  name: string;
  description: string | null;
}

async function getCategorySeo(storeId: string, categorySlug: string): Promise<CategorySeo | null> {
  const { data } = await supabase
    .from("categories")
    .select("name, description")
    .eq("store_id", storeId)
    .eq("slug", categorySlug)
    .eq("is_active", true)
    .maybeSingle();
  return (data as CategorySeo | null) ?? null;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { store_slug, category_slug } = await params;
  const store = await getStoreBySlugFull(store_slug);
  if (!store) return { title: "Store Not Found" };

  const category = await getCategorySeo(store.id, category_slug);
  if (!category) return { title: "Category Not Found" };

  const description =
    category.description?.trim() ||
    `Shop ${category.name} at ${store.store_name}. Browse the full ${category.name} collection online.`;
  const url = `${baseUrl}/${store_slug}/category/${category_slug}`;

  return {
    title: category.name,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${category.name} | ${store.store_name}`, description, url },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { store_slug, category_slug } = await params;
  const store = await getStoreBySlugFull(store_slug);
  if (!store) notFound();

  const category = await getCategorySeo(store.id, category_slug);
  if (!category) notFound();

  return (
    <>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{category.name}</h1>
        {category.description && (
          <p className="mt-2 max-w-3xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            {category.description}
          </p>
        )}
      </div>
      <ShopClient storeSlug={store_slug} categorySlug={category_slug} />
    </>
  );
}
