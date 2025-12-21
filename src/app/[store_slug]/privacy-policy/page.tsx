"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoreBySlug } from "@/lib/queries/stores/getStoreBySlug";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";

export default function PrivacyPolicyPageClient() {
  const params = useParams();
  const storeSlugParam = params?.store_slug;

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

      // Clean HTML - remove data attributes and fix list structure
      if (settings?.privacy_policy) {
        let cleaned = settings.privacy_policy;

        // Remove data attributes
        cleaned = cleaned.replace(/data-(start|end)="[^"]*"/g, "");

        // Convert <p> inside <li> to just content (preserving formatting)
        cleaned = cleaned.replace(
          /<li[^>]*>\s*<p[^>]*>([^<]*)<\/p>\s*<\/li>/g,
          "<li>$1</li>"
        );

        // For more complex <p> tags with nested elements
        cleaned = cleaned.replace(
          /<li[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/li>/g,
          "<li>$1</li>"
        );

        setPrivacyPolicy(cleaned);
      } else {
        setPrivacyPolicy(null);
      }

      setLoading(false);
    };

    fetchPolicy();
  }, [storeSlug]);

  if (loading) return <p>Loading privacy policy...</p>;
  if (!privacyPolicy) return <p>No privacy policy found.</p>;

  return (
    <div className="w-full py-16 px-4 sm:px-10 lg:px-10">
      <div className="w-full border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8 sm:p-12">
        <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
          <div
            className="
              text-gray-700 dark:text-gray-300
              [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:pb-2 
              [&_h2]:border-b [&_h2]:border-gray-200 dark:[&_h2]:border-gray-800
              [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-4
              [&_p]:my-3 [&_p]:leading-relaxed
              [&_ul]:my-4 [&_ul]:pl-6 [&_ul]:list-disc
              [&_ol]:my-4 [&_ol]:pl-6 [&_ol]:list-decimal
              [&_li]:my-2 [&_li]:leading-relaxed
              [&_strong]:font-semibold [&_strong]:text-gray-900 dark:[&_strong]:text-white
              [&_hr]:my-8 [&_hr]:border-t [&_hr]:border-gray-200 dark:[&_hr]:border-gray-800
              [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline
            "
            dangerouslySetInnerHTML={{ __html: privacyPolicy }}
          />
        </div>
      </div>
    </div>
  );
}
