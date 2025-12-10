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

  const [termsCondition, setTermsCondition] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeSlug) return;

    const fetchPolicy = async () => {
      setLoading(true);
      const store = await getStoreBySlug(storeSlug);
      if (!store) {
        setTermsCondition(null);
        setLoading(false);
        return;
      }

      const settings = await getStoreSettings(store.id);
      setTermsCondition(settings?.privacy_policy || null);
      setLoading(false);
    };

    fetchPolicy();
  }, [storeSlug]);

  if (loading) return <p>Loading Terms & Condition...</p>;
  if (!termsCondition) return <p>No Terms & Condition found.</p>;

  return (
    <div className="w-full py-16 px-4 sm:px-10 lg:px-10 ">
      <div className="w-full   border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8 sm:p-12">
        <h1 className="text-4xl font-bold mb-6">Terms & Condition</h1>

        <div
          className="
          prose 
          prose-gray 
          dark:prose-invert
          prose-headings:font-semibold
          prose-headings:text-gray-900 dark:prose-headings:text-gray-100
          prose-h2:text-2xl prose-h2:mt-10 prose-h2:pb-2
          prose-h3:text-xl prose-h3:mt-6
          prose-p:text-gray-700 dark:prose-p:text-gray-300
          prose-li:text-gray-700 dark:prose-li:text-gray-300
          prose-strong:text-gray-900 dark:prose-strong:text-white
          prose-a:text-blue-600 dark:prose-a:text-blue-400
          prose-ul:my-4
          border-t border-gray-200 dark:border-gray-800 pt-6
        "
          dangerouslySetInnerHTML={{ __html: termsCondition }}
        />
      </div>
    </div>
  );
}
