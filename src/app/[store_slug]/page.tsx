import { notFound } from "next/navigation";
import { getStoreHomeData } from "@/lib/queries/storefront/getStoreHomeData";
import StoreHomeClient from "./StoreHomeClient";

// Hero slides, coupons, flash sales and stock change from the dashboard
// without revalidating this route, so it renders fresh on every request
// rather than serving a cached copy up to a few minutes old.
export const dynamic = "force-dynamic";

interface StoreHomePageProps {
  params: Promise<{ store_slug: string }>;
}

export default async function StoreHomePage({ params }: StoreHomePageProps) {
  const { store_slug } = await params;
  const data = await getStoreHomeData(store_slug);
  if (!data) notFound();

  return <StoreHomeClient storeSlug={store_slug} data={data} />;
}
