// app/components/admin/common/TrialEnded.tsx
"use client";

import Link from "next/link";
import React from "react";

export default function TrialEnded() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-green-50 to-green-100 px-4">
      <div className="max-w-md w-full bg-background rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-7 w-7 text-green-700"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3M12 2a10 10 0 1010 10A10 10 0 0012 2z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-primary">
          Your Free Trial Has Ended
        </h1>

        {/* Description */}
        <p className="mt-3 text-sm text-primary leading-relaxed">
          Thanks for trying our platform! Your trial period has now ended.
        </p>

        <p className="mt-2 text-sm text-primary leading-relaxed">
          To continue managing your store, accessing orders, customers, and
          analytics, please choose a plan and complete your payment.
        </p>

        {/* Highlight box */}
        <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          Your store and data are safe — nothing has been deleted.
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <Link
            href="/contact-us"
            className="inline-flex w-full items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-primary hover:bg-green-800 transition"
          >
            Upgrade & Continue
          </Link>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-xs text-gray-500">
          Need help choosing a plan? Our support team is happy to help.
        </p>
      </div>
    </div>
  );
}
