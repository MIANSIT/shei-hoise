// File: app/components/admin/dashboard/store-settings/storeCard/StoreSeoCard.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, X, Check, Search } from "lucide-react";
import type { StoreData, UpdatedStoreData } from "@/lib/types/store/store";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useTranslation } from "@/lib/hook/useTranslation";

interface StoreSeoCardProps {
  store: StoreData;
  onUpdate: (data: UpdatedStoreData) => Promise<void>;
}

export function StoreSeoCard({ store, onUpdate }: StoreSeoCardProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const notify = useSheiNotification();
  const t = useTranslation();

  const [formData, setFormData] = useState({
    seo_title: store.seo_title || "",
    seo_description: store.seo_description || "",
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onUpdate({
        seo_title: formData.seo_title || null,
        seo_description: formData.seo_description || null,
      });
      setEditing(false);
      notify.success(t.admin.storeSeoSaveOk);
    } catch (err) {
      console.error(err);
      notify.error(t.admin.storeSeoSaveFail);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      seo_title: store.seo_title || "",
      seo_description: store.seo_description || "",
    });
    setEditing(false);
  };

  const previewTitle = formData.seo_title || store.store_name;
  const previewDescription =
    formData.seo_description ||
    store.short_description ||
    store.description ||
    `Shop at ${store.store_name} – browse our latest products.`;

  return (
    <Card className="border-0 shadow-sm bg-card ring-1 ring-border/60 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              {t.admin.storeSeoTitle}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t.admin.storeSeoDesc}
            </p>
          </div>
          {editing ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                className="h-8 px-3 text-xs font-semibold gap-1.5"
                onClick={handleSubmit}
                disabled={loading}
              >
                <Check className="h-3.5 w-3.5" />
                {loading ? t.admin.storeMgmtSaving : t.admin.storeMgmtSave}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs font-medium gap-1.5"
                onClick={handleCancel}
                disabled={loading}
              >
                <X className="h-3.5 w-3.5" />
                {t.admin.storeMgmtCancel}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-medium gap-1.5 hover:bg-muted/50"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3 w-3" />
              {t.admin.storeMgmtEdit}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {editing && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                {t.admin.storeSeoTitleLabel}
              </label>
              <input
                type="text"
                value={formData.seo_title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, seo_title: e.target.value.slice(0, 70) }))
                }
                placeholder={store.store_name}
                className="w-full bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 px-3 py-2 rounded-lg text-sm transition-all outline-none text-foreground placeholder:text-muted-foreground"
              />
              <p className="mt-1 text-right text-[11px] text-muted-foreground">
                {formData.seo_title.length}/60
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                {t.admin.storeSeoDescLabel}
              </label>
              <textarea
                value={formData.seo_description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, seo_description: e.target.value.slice(0, 200) }))
                }
                placeholder={t.admin.storeSeoDescPlaceholder}
                rows={3}
                className="w-full bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 px-3 py-2 rounded-lg resize-none text-sm transition-all outline-none text-foreground placeholder:text-muted-foreground"
              />
              <p className="mt-1 text-right text-[11px] text-muted-foreground">
                {formData.seo_description.length}/160
              </p>
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            {t.admin.storeSeoPreviewLabel}
          </p>
          <div className="rounded-lg border border-border bg-muted/20 p-3.5">
            <p className="truncate text-[13px] text-emerald-700 dark:text-emerald-400">
              sheihoise.com &rsaquo; {store.store_slug}
            </p>
            <p className="mt-0.5 truncate text-lg text-blue-700 dark:text-blue-400">
              {previewTitle}
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {previewDescription}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
