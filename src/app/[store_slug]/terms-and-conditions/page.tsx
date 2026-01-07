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

  const [termsCondition, setTermsCondition] = useState<string | null>(null);
  const [processingDays, setProcessingDays] = useState<number | null>(null);
  const [returnDays, setReturnDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeSlug) return;

    const fetchPolicy = async () => {
      setLoading(true);

      const store = await getStoreBySlug(storeSlug);
      if (!store) {
        setTermsCondition(null);
        setProcessingDays(null);
        setReturnDays(null);
        setLoading(false);
        return;
      }

      const settings = await getStoreSettings(store.id);

      if (settings?.terms_and_conditions) {
        let cleaned = settings.terms_and_conditions;

        cleaned = cleaned.replace(/data-(start|end)="[^"]*"/g, "");

        cleaned = cleaned.replace(
          /<li[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/li>/g,
          "<li>$1</li>"
        );

        setTermsCondition(cleaned);
        setProcessingDays(null);
        setReturnDays(null);
      } else {
        setTermsCondition(null);
        setProcessingDays(settings?.processing_time_days ?? null);
        setReturnDays(settings?.return_policy_days ?? null);
      }

      setLoading(false);
    };

    fetchPolicy();
  }, [storeSlug]);

  if (loading) return <p>Loading Terms & Condition...</p>;

  // 👉 FALLBACK VIEW (NO TERMS FOUND)
  if (!termsCondition) {
    return (
      <div className="w-full py-16 px-4 sm:px-10 lg:px-10">
         <h1>Terms & Condition</h1>
        <div className="w-full border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8 sm:p-12 space-y-4 mt-3">
          {processingDays !== null && (
            <div className="flex justify-between border-b pb-2 text-lg">
              <span>Processing Time</span>
              <span className="font-semibold">{processingDays} days</span>
            </div>
          )}

          {returnDays !== null && (
            <div className="flex justify-between border-b pb-2 text-lg">
              <span>Return Policy</span>
              <span className="font-semibold">{returnDays} days</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 👉 TERMS & CONDITION VIEW
  return (
    <div className="w-full py-16 px-4 sm:px-10 lg:px-10">
      <div className="w-full border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8 sm:p-12">
        <h1 className="text-4xl font-bold mb-6">Terms & Condition</h1>

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
            dangerouslySetInnerHTML={{ __html: termsCondition }}
          />
        </div>
      </div>
    </div>
  );
}
