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
import { ImageUploader } from "./ImageUploader";
import Link from "next/link";
import { BASE_URL } from "@/lib/utils/constants"; 

interface Props {
  store: StoreData;
}

export function StoreHeader({ store }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(store.logo_url);
  const [bannerPreview, setBannerPreview] = useState(store.banner_url);

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
    {
      variant: "default" | "secondary" | "destructive" | "outline";
      label: string;
    }
  > = {
    [StoreStatus.PENDING]: { variant: "secondary", label: "Pending" },
    [StoreStatus.APPROVED]: { variant: "default", label: "Verified" },
    [StoreStatus.REJECTED]: { variant: "destructive", label: "Rejected" },
    [StoreStatus.TRAIL]: { variant: "outline", label: "Trial" },
  };

  const statusInfo = store.status
    ? statusConfig[store.status as StoreStatus]
    : null;

  const handleModalOk = () => {
    message.success("Images updated!");
    setIsModalOpen(false);
    if (logoFile) setLogoPreview(URL.createObjectURL(logoFile));
    if (bannerFile) setBannerPreview(URL.createObjectURL(bannerFile));
  };

  return (
    <>
      <Card className="overflow-hidden border shadow-sm">
        {/* Banner - Responsive height */}
        <div className="relative h-32 sm:h-40 md:h-48 w-full bg-linear-to-r from-primary/5 to-primary/10">
          {bannerPreview ? (
            <Image
              src={bannerPreview}
              alt="Store banner"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 100vw, 100vw"
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-gray-100 to-gray-200" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-background/10 to-background/30" />
        </div>

        {/* Header content */}
        <div className="relative px-4 sm:px-6 pb-4 sm:pb-6 pt-4">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 sm:gap-4 w-full md:w-auto">
              {/* Logo - Responsive sizing */}
              <div className="relative -mt-12 sm:-mt-14 md:-mt-16 h-20 w-20 sm:h-24 sm:w-24 md:h-32 md:w-32 shrink-0 overflow-hidden rounded-xl sm:rounded-2xl border-4 border-background bg-background shadow-lg">
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt={store.store_name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 128px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/10 to-primary/20">
                    <span className="text-2xl sm:text-3xl md:text-4xl text-primary">
                      🏪
                    </span>
                  </div>
                )}
                <div
                  className={`absolute top-1 sm:top-2 right-1 sm:right-2 w-2 h-2 sm:w-3 sm:h-3 rounded-full border-2 border-background ${
                    store.is_active ? "bg-green-500" : "bg-red-500"
                  }`}
                />
              </div>

              {/* Store info */}
              <div className="space-y-1 pb-1 sm:pb-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight wrap-break-word md:truncate">
                    {store.store_name}
                  </h1>
                  {statusInfo && (
                    <Badge 
                      variant={statusInfo.variant}
                      className="text-xs sm:text-sm"
                    >
                      {statusInfo.label}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                  <span className="font-mono bg-muted px-1.5 sm:px-2 py-0.5 sm:py-1 rounded truncate max-w-[120px] sm:max-w-none">
                    @{store.store_slug}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="whitespace-nowrap">Age: {getStoreAge(store.created_at!)}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="whitespace-nowrap">
                    {store.is_active ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500" />
                        Inactive
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions - Responsive buttons */}
            <div className="flex flex-wrap gap-2 mt-3 sm:mt-4 md:mt-0 w-full sm:w-auto">
              <Link
                href={`${BASE_URL}/${store.store_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none"
              >
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full sm:w-auto"
                  icon={<EyeOutlined />}
                >
                  <span className="hidden xs:inline">View Public</span>
                  <span className="xs:hidden">View</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                icon={<EditOutlined />}
                onClick={() => setIsModalOpen(true)}
              >
                <span className="hidden xs:inline">Update Images</span>
                <span className="xs:hidden">Edit</span>
              </Button>
            </div>
          </div>

          {/* Store description */}
          {store.description && (
            <div className="mt-3 sm:mt-4 md:mt-6 pt-3 sm:pt-4 md:pt-6 border-t">
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed wrap-break-word">
                {store.description}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Modal - Responsive layout */}
      <Modal
        title="Edit Store Images"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button 
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={handleModalOk}
              className="w-full sm:w-auto"
            >
              Update
            </Button>
          </div>
        }
        width="90vw"
        className="max-w-2xl"
      >
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
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

