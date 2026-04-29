"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoreBySlug } from "@/lib/queries/stores/getStoreBySlug";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";

type ShippingFee = {
  name: string;
  price: number;
  estimated_days?: string;
  customer_view?: boolean;
};

export default function PrivacyPolicyPageClient() {
  const params = useParams();
  const storeSlugParam = params?.store_slug;

  const storeSlug = Array.isArray(storeSlugParam)
    ? storeSlugParam[0]
    : storeSlugParam;

  const [privacyPolicy, setPrivacyPolicy] = useState<string | null>(null);
  const [shippingFees, setShippingFees] = useState<ShippingFee[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeSlug) return;

    const fetchPolicy = async () => {
      setLoading(true);

      const store = await getStoreBySlug(storeSlug);
      if (!store) {
        setPrivacyPolicy(null);
        setShippingFees(null);
        setLoading(false);
        return;
      }

      const settings = await getStoreSettings(store.id);

      if (settings?.privacy_policy) {
        let cleaned = settings.privacy_policy;

        // Remove data attributes
        cleaned = cleaned.replace(/data-(start|end)="[^"]*"/g, "");

        // Fix <li><p>...</p></li> issue
        cleaned = cleaned.replace(
          /<li[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/li>/g,
          "<li>$1</li>"
        );

        setPrivacyPolicy(cleaned);
        setShippingFees(null);
      } else {
        setPrivacyPolicy(null);
        const fees = (settings?.shipping_fees || []) as ShippingFee[];
        setShippingFees(fees.filter((fee) => fee.customer_view !== false));
      }

      setLoading(false);
    };

    fetchPolicy();
  }, [storeSlug]);

  if (loading) {
    return <p>Loading...</p>;
  }

  // 👉 SHOW ONLY SHIPPING FEES
  if (!privacyPolicy && shippingFees) {
    return (
      <div className="w-full min-h-screen py-16 px-4 sm:px-10 lg:px-10">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-sm font-medium px-3 py-1 rounded-full mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
            Delivery Info
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shipping Rates</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Choose your delivery zone and see pricing</p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {shippingFees.map((fee, index) => (
            <div
              key={index}
              className="relative group rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Accent bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-indigo-500 rounded-t-2xl" />

              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>

              {/* Name */}
              <p className="text-base font-semibold text-gray-800 dark:text-gray-100">{fee.name}</p>

              {/* Estimated days */}
              {fee.estimated_days && (
                <div className="inline-flex items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {fee.estimated_days} days delivery
                </div>
              )}

              {/* Price */}
              <div className="mt-5 flex items-end justify-between">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {fee.price === 0 ? "Free" : `৳ ${fee.price}`}
                </span>
                {fee.price > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">delivery charge</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 👉 SHOW PRIVACY POLICY
  return (
    <div className="w-full py-16 px-4 sm:px-10 lg:px-10">
      <div className="w-full border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8 sm:p-12">
        <div
          className="
            text-gray-700 dark:text-gray-300
            [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4
            [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-4
            [&_p]:my-3 [&_p]:leading-relaxed
            [&_ul]:my-4 [&_ul]:pl-6 [&_ul]:list-disc
            [&_ol]:my-4 [&_ol]:pl-6 [&_ol]:list-decimal
            [&_li]:my-2 [&_li]:leading-relaxed
            [&_strong]:font-semibold
            [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline
          "
          dangerouslySetInnerHTML={{ __html: privacyPolicy! }}
        />
      </div>
    </div>
  );
}
