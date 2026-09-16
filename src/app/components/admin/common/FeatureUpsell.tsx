"use client";

import Link from "next/link";
import { LockOutlined } from "@ant-design/icons";

interface FeatureUpsellProps {
  title: string;
  description: string;
}

/** Generic version of ExportUpsell.tsx's popover content — same shape, different copy, for any plan-gated feature (QR/barcode labels, etc.) rather than just data export. */
export default function FeatureUpsell({ title, description }: FeatureUpsellProps) {
  return (
    <div style={{ width: 240 }} className="p-1">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
        <LockOutlined className="text-muted-foreground" />
      </div>
      <p className="m-0 text-[13px] font-semibold text-foreground text-center">{title}</p>
      <p className="m-0 mt-1 text-[11.5px] text-muted-foreground text-center leading-relaxed">
        {description}
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
