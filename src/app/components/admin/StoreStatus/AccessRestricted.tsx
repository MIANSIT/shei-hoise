// app/components/admin/common/AccessRestricted.tsx
"use client";

import Link from "next/link";
import React from "react";
import { useTranslation } from "@/lib/hook/useTranslation";

interface AccessRestrictedProps {
  status?: string;
}

export default function AccessRestricted({  }: AccessRestrictedProps) {
  const t = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-green-50 to-green-100 px-4">
      <div className="max-w-md w-full bg-background rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
          <svg
            className="h-7 w-7 text-yellow-700"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3m0 4h.01M12 2a10 10 0 1010 10A10 10 0 0012 2z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-primary">
          {t.admin.accessRestrictedTitle}
        </h1>

        {/* Description */}
        <p className="mt-3 text-sm text-primary leading-relaxed">
          {t.admin.accessRestrictedP1}
        </p>

        <p className="mt-2 text-sm text-primary leading-relaxed">
          {t.admin.accessRestrictedP2}
        </p>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <Link
            href="/contact-us"
            className="inline-flex w-full items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-primary hover:bg-green-800 transition"
          >
            {t.admin.contactSupport}
          </Link>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-xs text-primary">
          {t.admin.accessRestrictedFooter}
        </p>
      </div>
    </div>
  );
}
