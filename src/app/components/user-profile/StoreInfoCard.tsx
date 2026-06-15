"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/hook/useTranslation";

interface StoreInfoCardProps {
  storeSlug?: string | null;
  storeName?: string | null;
}

export function StoreInfoCard({ storeSlug, storeName }: StoreInfoCardProps) {
  const t = useTranslation();

  if (!storeSlug) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Store className="w-5 h-5" />
          {t.admin.myProfileStoreInfo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {storeName && (
            <div>
              <div className="text-sm font-medium text-foreground">
                {t.admin.myProfileStoreName}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {storeName}
              </div>
            </div>
          )}
          {storeSlug && (
            <div>
              <div className="text-sm font-medium text-foreground">
                {t.admin.myProfileStoreUrl}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded border">
                  {storeSlug}
                </div>
                <Link
                  href={`/${storeSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3 text-gray-400 cursor-pointer" />
                </Link>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {t.admin.myProfileStoreWebAddr}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
