"use client";

import Link from "next/link";
import { Spin } from "antd";
import { Megaphone } from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";
import { BrandPaletteCard } from "@/app/components/admin/dashboard/storefrontDesign/BrandPaletteCard";

export default function StorefrontDesignPage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const { loading: featureLoading, allowed } = useFeatureGate(storeId, "storefront_design");

  if (userLoading || featureLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spin size="large" />
      </div>
    );
  }

  if (!allowed) return <FeatureLocked />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Storefront Design</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize your homepage brand colors.
        </p>
      </div>

      <BrandPaletteCard />

      <Link
        href="/dashboard/announcements"
        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 sm:p-6 hover:border-primary/50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
            <Megaphone className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Announcement Bar</p>
            <p className="text-xs text-muted-foreground">
              Manage the line(s) shown above your homepage header
            </p>
          </div>
        </div>
        <span className="text-sm font-semibold text-primary group-hover:underline shrink-0">Manage →</span>
      </Link>
    </div>
  );
}
