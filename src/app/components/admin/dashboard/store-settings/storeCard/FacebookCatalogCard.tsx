"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";

interface FacebookCatalogCardProps {
  storeSlug: string;
}

export function FacebookCatalogCard({ storeSlug }: FacebookCatalogCardProps) {
  const [copied, setCopied] = useState(false);
  const t = useTranslation();

  const feedUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/feed/${storeSlug}`
      : `/api/feed/${storeSlug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied — nothing to recover, the URL is still visible to copy manually.
    }
  };

  return (
    <Card className="border-0 shadow-sm bg-card ring-1 ring-border/60 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-border bg-muted/20">
        <CardTitle className="text-base font-semibold text-foreground">
          {t.admin.storeMgmtCatalogTitle}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t.admin.storeMgmtCatalogDesc}
        </p>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            {t.admin.storeMgmtCatalogFeedUrl}
          </label>
          <div className="flex mt-1.5">
            <input
              type="text"
              readOnly
              value={feedUrl}
              className="flex-1 text-sm bg-muted/40 border border-border rounded-l-lg px-3 py-2 text-foreground truncate"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground px-3 rounded-r-lg hover:opacity-90 transition-opacity"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t.admin.storeMgmtCatalogCopied : t.admin.storeMgmtCatalogCopy}
            </button>
          </div>
        </div>

        <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
          <li>{t.admin.storeMgmtCatalogStep1}</li>
          <li>{t.admin.storeMgmtCatalogStep2}</li>
          <li>{t.admin.storeMgmtCatalogStep3}</li>
        </ol>
      </CardContent>
    </Card>
  );
}
