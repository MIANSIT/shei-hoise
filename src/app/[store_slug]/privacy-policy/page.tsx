"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoreBySlug } from "@/lib/queries/stores/getStoreBySlug";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";

export default function PrivacyPolicyPageClient() {
  const params = useParams();
  const storeSlugParam = params?.store_slug;

  // Ensure it's a string
  const storeSlug = Array.isArray(storeSlugParam)
    ? storeSlugParam[0]
    : storeSlugParam;

  const [privacyPolicy, setPrivacyPolicy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeSlug) return;

    const fetchPolicy = async () => {
      setLoading(true);
      const store = await getStoreBySlug(storeSlug);
      if (!store) {
        setPrivacyPolicy(null);
        setLoading(false);
        return;
      }

      const settings = await getStoreSettings(store.id);
      setPrivacyPolicy(settings?.privacy_policy || null);
      setLoading(false);
    };

    fetchPolicy();
  }, [storeSlug]);

  if (loading) return <p>Loading privacy policy...</p>;
  if (!privacyPolicy) return <p>No privacy policy found.</p>;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div
        className="prose prose-lg"
        dangerouslySetInnerHTML={{ __html: privacyPolicy }}
      />
    </div>
  );
}
