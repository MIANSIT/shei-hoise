"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/hook/useTranslation";
import { MAX_BRAND_LOGO_BYTES, type Brand } from "@/lib/types/brand";

export interface BrandFormValues {
  name: string;
  is_active: boolean;
  /** undefined = leave the logo alone, null = remove it, File = replace it. */
  logo: File | null | undefined;
}

interface BrandFormModalProps {
  open: boolean;
  /** The brand being edited, or null to create a new one. */
  brand: Brand | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: BrandFormValues) => void | Promise<void>;
}

export function BrandFormModal({ open, brand, saving, onClose, onSubmit }: BrandFormModalProps) {
  const t = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [logo, setLogo] = useState<File | null | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Reset whenever the dialog opens for a different brand (or for a new one).
  useEffect(() => {
    if (!open) return;
    setName(brand?.name ?? "");
    setIsActive(brand?.is_active ?? true);
    setLogo(undefined);
    setFileError(null);
  }, [open, brand]);

  // Blob URL for a freshly picked file; revoked when it's replaced or the dialog closes.
  useEffect(() => {
    if (!(logo instanceof File)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(logo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BRAND_LOGO_BYTES) {
      setFileError("The logo is too large. Use an image under 4 MB.");
      return;
    }
    setFileError(null);
    setLogo(file);
  };

  // What the preview box shows: a new pick, else the saved logo unless it was just removed.
  const shownLogo = previewUrl ?? (logo === null ? null : (brand?.logo_url ?? null));
  const canSubmit = name.trim().length > 0 && !saving;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent className="w-[calc(100vw-24px)] sm:max-w-md rounded-2xl p-0 border-0 shadow-2xl">
        <div className="px-5 py-4 border-b border-border">
          <DialogTitle className="text-base font-bold text-foreground">
            {brand ? t.admin.brandsEditTitle : t.admin.brandsCreateTitle}
          </DialogTitle>
        </div>

        <form
          className="p-5 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            void onSubmit({ name: name.trim(), is_active: isActive, logo });
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="brand-name" className="text-sm font-medium text-foreground">
              {t.admin.brandsNameLabel}
              <span className="ml-0.5 text-rose-500">*</span>
            </label>
            <Input
              id="brand-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.admin.brandsNamePlaceholder}
              maxLength={80}
              autoFocus
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">{t.admin.brandsLogoLabel}</p>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                {shownLogo ? (
                  <Image
                    src={shownLogo}
                    alt={name || t.admin.brandsLogoLabel}
                    fill
                    unoptimized={!!previewUrl}
                    className="object-contain p-1.5"
                    sizes="80px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-start gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  {shownLogo ? t.admin.brandsChangeLogo : t.admin.brandsChooseLogo}
                </Button>
                {shownLogo && (
                  <button
                    type="button"
                    onClick={() => setLogo(null)}
                    className="inline-flex items-center gap-1 text-xs text-rose-500 hover:underline"
                  >
                    <Trash2 className="h-3 w-3" />
                    {t.admin.brandsRemoveLogo}
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t.admin.brandsLogoHint}</p>
            {fileError && <p className="text-xs text-rose-500">{fileError}</p>}
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
            <span className="text-sm font-medium text-foreground">{t.admin.brandsStatusLabel}</span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {t.admin.brandsCancel}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.admin.brandsSaving}
                </>
              ) : (
                t.admin.brandsSave
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
