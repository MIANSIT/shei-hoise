import ShopClient from "./ShopClient";

interface ShopPageProps {
  params: Promise<{ store_slug: string }>;
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { store_slug } = await params;
  return <ShopClient storeSlug={store_slug} />;
}
