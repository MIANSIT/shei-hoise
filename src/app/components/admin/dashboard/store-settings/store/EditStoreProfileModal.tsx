"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import UploadImage from "@/app/components/admin/dashboard/store-settings/store/UploadImage"; // <-- adjust path
import type { StoreData } from "@/lib/types/store/store";

interface EditStoreProfileModalProps {
  store: StoreData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: Partial<StoreData>) => Promise<void>;
}

type StoreFormValues = {
  store_name: string;
  store_slug: string;
  description?: string;
  contact_email: string;
  contact_phone: string;
  business_address: string;
  tax_id?: string;
  business_license?: string;
  logo?: File | string;
  banner?: File | string;
};

export default function EditStoreProfileModal({
  store,
  isOpen,
  onClose,
  onSave,
}: EditStoreProfileModalProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<StoreFormValues>({
    defaultValues: {
      store_name: store.store_name,
      store_slug: store.store_slug,
      description: store.description || "",
      contact_email: store.contact_email || "",
      contact_phone: store.contact_phone || "",
      business_address: store.business_address || "",
      tax_id: store.tax_id || "",
      business_license: store.business_license || "",
      logo: store.logo_url || undefined,
      banner: store.banner_url || undefined,
    },
  });

  const onSubmit = async (data: StoreFormValues) => {
    try {
      const payload: Partial<StoreData> = {
        store_name: data.store_name,
        store_slug: data.store_slug,
        description: data.description,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        business_address: data.business_address,
        tax_id: data.tax_id,
        business_license: data.business_license,
      };

      // Handle files
      if (data.logo instanceof File) {
        // upload logo
        // payload.logo_url = uploadedLogoUrl;
      }

      if (data.banner instanceof File) {
        // upload banner
        // payload.banner_url = uploadedBannerUrl;
      }

      await onSave(payload);
      onClose();
    } catch (error) {
      console.error("Error updating store:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Store Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* ================= Banner Upload ================= */}
          <div className="space-y-3">
            <Label>
              Store Banner <span className="text-red-600">*</span>
            </Label>

            <Controller
              name="banner"
              control={control}
              rules={{ required: "Banner is required" }}
              render={({ field }) => (
                <UploadImage field={field} label="Upload Banner" />
              )}
            />
          </div>

          {/* ================= Logo Upload ================= */}
          <div className="space-y-3">
            <Label>
              Store Logo <span className="text-red-600">*</span>
            </Label>

            <Controller
              name="logo"
              control={control}
              shouldUnregister // ⭐ THIS FIXES IT
              render={({ field }) => (
                <UploadImage field={field} label="Upload Logo" />
              )}
            />

            <p className="text-sm text-gray-500">
              • Recommended size: 400×400px <br />
              • Max file size: 5MB <br />• Formats: JPG, PNG, SVG
            </p>
          </div>

          {/* ================= Store Info ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Store Name <span className="text-red-600">*</span>
              </Label>
              <Input {...register("store_name", { required: true })} />
            </div>

            <div className="space-y-2">
              <Label>
                Store Slug <span className="text-red-600">*</span>
              </Label>
              <Input {...register("store_slug", { required: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Store Description</Label>
            <Textarea {...register("description")} />
          </div>

          {/* ================= Contact Info ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Contact Email <span className="text-red-600">*</span>
              </Label>
              <Input
                type="email"
                {...register("contact_email", { required: true })}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Contact Phone <span className="text-red-600">*</span>
              </Label>
              <Input
                type="tel"
                {...register("contact_phone", { required: true })}
              />
            </div>
          </div>

          {/* ================= Address ================= */}
          <div className="space-y-2">
            <Label>
              Business Address <span className="text-red-600">*</span>
            </Label>
            <Textarea
              rows={3}
              {...register("business_address", { required: true })}
            />
          </div>

          {/* ================= Legal ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tax ID</Label>
              <Input {...register("tax_id")} />
            </div>

            <div className="space-y-2">
              <Label>Business License</Label>
              <Input {...register("business_license")} />
            </div>
          </div>

          {/* ================= Footer ================= */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
