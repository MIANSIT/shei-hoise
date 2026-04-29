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

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // 👉 FALLBACK VIEW (NO TERMS FOUND)
  if (!termsCondition) {
    return (
      <div className="w-full min-h-screen py-16 px-4 sm:px-10 lg:px-10">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-sm font-medium px-3 py-1 rounded-full mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Store Policy
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Terms & Conditions</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Our order processing and return policies</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
          {processingDays !== null && (
            <div className="relative rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-purple-500 to-violet-500 rounded-t-2xl" />
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Processing Time</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {processingDays}
                <span className="text-base font-normal text-gray-500 dark:text-gray-400 ml-1">days</span>
              </p>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">After order confirmation</p>
            </div>
          )}

          {returnDays !== null && (
            <div className="relative rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-emerald-500 to-teal-500 rounded-t-2xl" />
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 2 1 2-1 2 1 2-1 4 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Return Policy</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {returnDays}
                <span className="text-base font-normal text-gray-500 dark:text-gray-400 ml-1">days</span>
              </p>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">From delivery date</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 👉 TERMS & CONDITION VIEW
  return (
    <div className="w-full min-h-screen py-16 px-4 sm:px-10 lg:px-10">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-sm font-medium px-3 py-1 rounded-full mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Legal
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Terms & Conditions</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Please read these terms carefully before using our services</p>
      </div>

      {/* Content card */}
      <div className="relative w-full rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-purple-500 to-violet-500" />
        <div className="p-8 sm:p-12">
          <div
            className="
              text-gray-700 dark:text-gray-300
              [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:pb-2
              [&_h2]:border-b [&_h2]:border-gray-100 dark:[&_h2]:border-gray-800
              [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-4
              [&_p]:my-3 [&_p]:leading-relaxed
              [&_ul]:my-4 [&_ul]:pl-6 [&_ul]:list-disc
              [&_ol]:my-4 [&_ol]:pl-6 [&_ol]:list-decimal
              [&_li]:my-2 [&_li]:leading-relaxed
              [&_strong]:font-semibold [&_strong]:text-gray-900 dark:[&_strong]:text-white
              [&_hr]:my-8 [&_hr]:border-t [&_hr]:border-gray-100 dark:[&_hr]:border-gray-800
              [&_a]:text-purple-600 dark:[&_a]:text-purple-400 [&_a]:underline
            "
            dangerouslySetInnerHTML={{ __html: termsCondition }}
          />
        </div>
      </div>
    </div>
  );
}
