"use client";

import { useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StoreStatus } from "@/lib/types/enums";
import { StoreData } from "@/lib/types/store/store";
import { EditOutlined, EyeOutlined } from "@ant-design/icons";
import { Modal, message } from "antd";
import { ImageUploader } from "./ImageUploader"; // import the reusable component
import Link from "next/link";
import { BASE_URL } from "@/lib/utils/constants"; 

interface Props {
  store: StoreData;
}

export function StoreHeader({ store }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // Live preview URLs
  const [logoPreview, setLogoPreview] = useState(store.logo_url);
  const [bannerPreview, setBannerPreview] = useState(store.banner_url);

  /* Utility: Calculate store age */
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

  /* Status badge configuration */
  const statusConfig: Record<
    StoreStatus,
    {
      variant: "default" | "secondary" | "destructive" | "outline";
      label: string;
    }
  > = {
    [StoreStatus.PENDING]: { variant: "secondary", label: "Pending Review" },
    [StoreStatus.APPROVED]: { variant: "default", label: "Active & Verified" },
    [StoreStatus.REJECTED]: { variant: "destructive", label: "Rejected" },
    [StoreStatus.TRAIL]: { variant: "outline", label: "Trial Period" },
  };

  const statusInfo = store.status
    ? statusConfig[store.status as StoreStatus]
    : null;

  const handleModalOk = () => {
    // Here you would upload logoFile and bannerFile to your API
    message.success("Images updated!");
    setIsModalOpen(false);
    if (logoFile) setLogoPreview(URL.createObjectURL(logoFile));
    if (bannerFile) setBannerPreview(URL.createObjectURL(bannerFile));
  };

  return (
    <>
      <Card className="overflow-hidden border shadow-sm">
        {/* Banner */}
        <div className="relative h-48 w-full bg-linear-to-r from-primary/5 to-primary/10">
          {bannerPreview ? (
            <Image
              src={bannerPreview}
              alt="Store banner"
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-gray-100 to-gray-200" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-background/10 to-background/30" />
        </div>

        {/* Header content */}
        <div className="relative px-4 sm:px-6 pb-6 pt-4">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full md:w-auto">
              {/* Logo */}
              <div className="relative -mt-16 h-24 w-24 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-background shadow-lg">
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt={store.store_name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/10 to-primary/20">
                    <span className="text-3xl sm:text-4xl text-primary">
                      🏪
                    </span>
                  </div>
                )}
                <div
                  className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-background ${
                    store.is_active ? "bg-green-500" : "bg-red-500"
                  }`}
                />
              </div>

              {/* Store info */}
              <div className="space-y-1 pb-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                    {store.store_name}
                  </h1>
                  {statusInfo && (
                    <Badge variant={statusInfo.variant}>
                      {statusInfo.label}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono bg-muted px-2 py-1 rounded-md truncate">
                    @{store.store_slug}
                  </span>
                  <span>•</span>
                  <span>Store Age: {getStoreAge(store.created_at!)}</span>
                  <span>•</span>
                  <span>
                    {store.is_active ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Inactive
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
              <Link
                href={`${BASE_URL}/${store.store_slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="default" size="sm" icon={<EyeOutlined />}>
                  View Public
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                icon={<EditOutlined />}
                onClick={() => setIsModalOpen(true)}
              >
                Update Images
              </Button>
            </div>
          </div>

          {/* Store description */}
          {store.description && (
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {store.description}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal
        title="Edit Store Images"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" onClick={handleModalOk}>
              Update
            </Button>
          </div>
        }
      >
        <div className="flex flex-row gap-4">
          <div className="flex-1">
            <ImageUploader
              label="Logo"
              value={logoPreview ?? undefined}
              onChange={(file) => {
                setLogoFile(file);
                if (file) setLogoPreview(URL.createObjectURL(file));
              }}
            />
          </div>

          <div className="flex-1">
            <ImageUploader
              label="Banner"
              value={bannerPreview ?? undefined}
              onChange={(file) => {
                setBannerFile(file);
                if (file) setBannerPreview(URL.createObjectURL(file));
              }}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
