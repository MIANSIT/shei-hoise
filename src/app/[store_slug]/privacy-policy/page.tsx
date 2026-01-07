"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoreBySlug } from "@/lib/queries/stores/getStoreBySlug";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";

type ShippingFee = {
  name: string;
  price: number;
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
        setShippingFees(settings?.shipping_fees || []);
      }

      setLoading(false);
    };

    fetchPolicy();
  }, [storeSlug]);

  if (loading) {
    return <p>Loading...</p>;
  }

  // 👉 SHOW ONLY SHIPPING FEES (NO HEADING)
  if (!privacyPolicy && shippingFees) {
    return (
      <div className="w-full py-16 px-4 sm:px-10 lg:px-10">
        <h1>Privacy Policy</h1>
        <div className="w-full border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8 sm:p-12 mt-3">
          <ul className="space-y-4">
            {shippingFees.map((fee, index) => (
              <li
                key={index}
                className="flex justify-between border-b border-gray-200 dark:border-gray-800 pb-2 text-lg"
              >
                <span>{fee.name}</span>
                <span className="font-semibold">৳ {fee.price}</span>
              </li>
            ))}
          </ul>
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
