// File: app/components/admin/dashboard/store-settings/storeCard/StoreHeader.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StoreStatus } from "@/lib/types/enums";
import { StoreData } from "@/lib/types/store/store";
import { Modal, message, Input } from "antd";
import { ImageUploader } from "./ImageUploader";
import Link from "next/link";
import { BASE_URL } from "@/lib/utils/constants";
import {
  Loader2,
  Store,
  Calendar,
  Activity,
  Camera,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { getStoreMediaUrl } from "@/lib/utils/store/storeMediaCache";

interface Props {
  store: StoreData;
  onUpdate: (updatedStore: StoreData) => void;
  updateStore: (data: {
    store_name: string;
    store_slug: string;
    logoFile?: File | null;
    bannerFile?: File | null;
    clearLogo?: boolean;
    clearBanner?: boolean;
  }) => Promise<StoreData>;
}

export function StoreHeader({ store, onUpdate, updateStore }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [bannerRemoved, setBannerRemoved] = useState(false);
  const [logoPreview, setLogoPreview] = useState(store.logo_url);
  const [bannerPreview, setBannerPreview] = useState(store.banner_url);
  const [storeName, setStoreName] = useState(store.store_name);
  const [storeSlug, setStoreSlug] = useState(store.store_slug);
  const [loading, setLoading] = useState(false);

  const notify = useSheiNotification();

  const getStoreAge = (createdAt: string | Date) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths > 0)
      return `${diffMonths} month${diffMonths > 1 ? "s" : ""}`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""}`;
  };

  const statusConfig: Record<
    StoreStatus,
    { pill: string; dot: string; label: string }
  > = {
    [StoreStatus.PENDING]: {
      pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20",
      dot: "bg-amber-500",
      label: "Pending",
    },
    [StoreStatus.APPROVED]: {
      pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20",
      dot: "bg-emerald-500",
      label: "Verified",
    },
    [StoreStatus.REJECTED]: {
      pill: "bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/20",
      dot: "bg-red-500",
      label: "Rejected",
    },
    [StoreStatus.TRIAL]: {
      pill: "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/20",
      dot: "bg-violet-500",
      label: "Trial",
    },
  };

  const statusInfo = store.status
    ? statusConfig[store.status as StoreStatus]
    : null;

  const handleOpenModal = () => {
    setLogoFile(null);
    setBannerFile(null);
    setLogoRemoved(false);
    setBannerRemoved(false);
    setLogoPreview(store.logo_url);
    setBannerPreview(store.banner_url);
    setStoreName(store.store_name);
    setStoreSlug(store.store_slug);
    setIsModalOpen(true);
  };

  const handleModalCancel = () => {
    setLogoFile(null);
    setBannerFile(null);
    setLogoRemoved(false);
    setBannerRemoved(false);
    setIsModalOpen(false);
  };

  const handleModalOk = async () => {
    setLoading(true);
    try {
      const updatedStore = await updateStore({
        store_name: storeName,
        store_slug: storeSlug,
        logoFile,
        bannerFile,
        clearLogo: logoRemoved,
        clearBanner: bannerRemoved,
      });
      setLogoPreview(updatedStore.logo_url);
      setBannerPreview(updatedStore.banner_url);
      setStoreName(updatedStore.store_name);
      setStoreSlug(updatedStore.store_slug);
      onUpdate(updatedStore);
      setLogoFile(null);
      setBannerFile(null);
      setLogoRemoved(false);
      setBannerRemoved(false);
      setIsModalOpen(false);
      notify.success("Store updated successfully!");
    } catch {
      message.error("Failed to update store");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-0 shadow-sm bg-card ring-1 ring-border/60">
        {/* Banner */}
        <div className="relative h-36 sm:h-44 md:h-52 w-full overflow-hidden">
          {bannerPreview ? (
            <Image
              src={getStoreMediaUrl(bannerPreview)}
              alt="Store banner"
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-slate-100 via-slate-50 to-zinc-100 dark:from-slate-800/80 dark:via-slate-900 dark:to-zinc-900">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                  backgroundSize: "28px 28px",
                  color: "rgb(148 163 184 / 0.5)",
                }}
              />
              <div className="absolute -top-8 -left-8 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
              <div className="absolute -bottom-8 right-10 h-32 w-32 rounded-full bg-violet-500/5 blur-3xl" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-card/70 via-transparent to-transparent" />
          <button
            onClick={handleOpenModal}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/80 backdrop-blur-md border border-border/60 text-xs font-medium text-foreground hover:bg-background transition-all duration-200 shadow-sm"
          >
            <Camera className="h-3 w-3" />
            <span className="hidden sm:inline">Edit banner</span>
          </button>
        </div>

        {/* Content */}
        <div className="relative px-5 sm:px-7 pb-6 pt-0">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            {/* Logo + Info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full md:w-auto">
              {/* Logo */}
              <div className="relative -mt-10 sm:-mt-12 shrink-0">
                <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-2xl border-[3px] border-card bg-card shadow-lg ring-1 ring-border/40">
                  {logoPreview ? (
                    <Image
                      src={getStoreMediaUrl(logoPreview)}
                      alt={store.store_name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-muted/60 to-muted/30">
                      <Store className="h-7 w-7 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card shadow-sm ${store.is_active ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                />
              </div>

              {/* Store Info */}
              <div className="pb-1 flex-1 min-w-0 mt-2 sm:mt-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {storeName}
                  </h1>
                  {statusInfo && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.pill}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`}
                      />
                      {statusInfo.label}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded-md border border-border text-muted-foreground">
                    @{storeSlug}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {getStoreAge(store.created_at!)} old
                  </span>
                  <span className="flex items-center gap-1 text-sm">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    {store.is_active ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Active
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-medium">
                        Inactive
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto md:pb-1">
              <Link
                href={`${BASE_URL}/${storeSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none"
              >
                <Button
                  variant="default"
                  size="sm"
                  className="w-full sm:w-auto h-9 px-4 text-sm font-medium gap-2"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">View Store</span>
                  <span className="sm:hidden">View</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none h-9 px-4 text-sm font-medium gap-2 hover:bg-muted/50"
                onClick={handleOpenModal}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit Store</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            </div>
          </div>

          {store.description && (
            <div className="mt-5 pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {store.description}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Pencil className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-base font-semibold text-foreground">
              Edit Store Profile
            </span>
          </div>
        }
        open={isModalOpen}
        onCancel={handleModalCancel}
        footer={
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
            <Button
              onClick={handleModalCancel}
              variant="outline"
              className="w-full sm:w-auto h-9"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleModalOk}
              disabled={loading}
              className="w-full sm:w-auto h-9 gap-2"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        }
        width="90vw"
        className="max-w-2xl"
      >
        <div className="flex flex-col gap-5 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Store Name
              </label>
              <Input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="h-9 rounded-lg"
                placeholder="My Awesome Store"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Store Slug
              </label>
              <Input
                value={storeSlug}
                onChange={(e) => setStoreSlug(e.target.value)}
                className="h-9 rounded-lg font-mono"
                placeholder="my-awesome-store"
                prefix={
                  <span className="text-muted-foreground text-sm font-mono">
                    @
                  </span>
                }
              />
            </div>
          </div>

          <div className="pt-1 border-t border-border">
            <p className="text-sm font-medium text-foreground mb-3">
              Store Media
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploader
                label="Logo"
                aspectHint="1:1 recommended"
                value={logoPreview ?? undefined}
                onChange={(file) => {
                  setLogoFile(file);
                  setLogoRemoved(file === null && !!store.logo_url);
                }}
              />
              <ImageUploader
                label="Banner"
                aspectHint="16:4 recommended"
                value={bannerPreview ?? undefined}
                onChange={(file) => {
                  setBannerFile(file);
                  setBannerRemoved(file === null && !!store.banner_url);
                }}
              />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
