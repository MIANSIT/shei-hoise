"use client";

import Link from "next/link";
import { LockOutlined } from "@ant-design/icons";

/** Popover content shown when a store's plan doesn't include the export_data feature. */
export default function ExportUpsell() {
  return (
    <div style={{ width: 240 }} className="p-1">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <LockOutlined className="text-gray-500 dark:text-gray-400" />
      </div>
      <p className="m-0 text-[13px] font-semibold text-gray-800 dark:text-gray-100 text-center">
        Export is a Pro feature
      </p>
      <p className="m-0 mt-1 text-[11.5px] text-gray-500 dark:text-gray-400 text-center leading-relaxed">
        Your current plan doesn&apos;t include data exports. Upgrade to download your full sheet anytime.
      </p>
      <Link
        href="/dashboard/subscription/plans"
        className="mt-3 flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-[12.5px] font-semibold text-primary-foreground hover:opacity-90 transition"
      >
        Upgrade plan
      </Link>
    </div>
  );
}
