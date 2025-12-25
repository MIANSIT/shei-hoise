"use client";

import { useState } from "react";
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
// import { Switch } from "antd"; // Import from antd
import { Upload, X } from "lucide-react";
import Image from "next/image";
import React from "react";
import type { StoreData } from "@/lib/types/store/store"; // Use correct path

interface EditStoreProfileModalProps {
  store: StoreData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: Partial<StoreData>) => Promise<void>;
}

export default function EditStoreProfileModal({
  store,
  isOpen,
  onClose,
  onSave,
}: EditStoreProfileModalProps) {
  const [formData, setFormData] = useState({
    store_name: store.store_name,
    store_slug: store.store_slug,
    description: store.description || "",
    contact_email: store.contact_email || "",
    contact_phone: store.contact_phone || "",
    business_address: store.business_address || "",
    tax_id: store.tax_id || "",
    business_license: store.business_license || "",
    is_active: store.is_active,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    store.logo_url || null
  );
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    store.banner_url || null
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, is_active: checked }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const previewUrl = URL.createObjectURL(file);
      setBannerPreview(previewUrl);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    // Clean up object URL to prevent memory leaks
    if (logoPreview && logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }
  };

  const removeBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    // Clean up object URL to prevent memory leaks
    if (bannerPreview && bannerPreview.startsWith("blob:")) {
      URL.revokeObjectURL(bannerPreview);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updatedData: Partial<StoreData> = { ...formData };

      // Handle file uploads
      if (logoFile) {
        // Upload logo to your storage service
        // const logoUrl = await uploadFile(logoFile);
        // updatedData.logo_url = logoUrl;
      }

      if (bannerFile) {
        // Upload banner to your storage service
        // const bannerUrl = await uploadFile(bannerFile);
        // updatedData.banner_url = bannerUrl;
      }

      await onSave(updatedData);
      onClose();
    } catch (error) {
      console.error("Error updating store:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Clean up object URLs when component unmounts
  React.useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
      if (bannerPreview && bannerPreview.startsWith("blob:")) {
        URL.revokeObjectURL(bannerPreview);
      }
    };
  }, [logoPreview, bannerPreview]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Store Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Banner Upload Section */}
          <div className="space-y-3">
            <Label>Store Banner<span className="text-red-600">*</span></Label>
            <div className="relative h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
              {bannerPreview ? (
                <div className="relative h-full w-full">
                  <Image
                    src={bannerPreview}
                    alt="Banner preview"
                    fill
                    className="object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeBanner}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer h-full w-full flex flex-col items-center justify-center">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">
                    Click to upload banner
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    required
                  />
                </label>
              )}
            </div>
          </div>

          {/* Logo Upload Section */}
          <div className="space-y-3">
            <Label>Store Logo<span className="text-red-600">*</span></Label>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
                {logoPreview ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      fill
                      className="object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer h-full w-full flex flex-col items-center justify-center">
                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">Upload logo</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      required
                    />
                  </label>
                )}
              </div>
              <div className="text-sm text-gray-500">
                <p>• Recommended size: 400×400px</p>
                <p>• Max file size: 2MB</p>
                <p>• Formats: JPG, PNG, SVG</p>
              </div>
            </div>
          </div>

          {/* Store Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store_name">Store Name <span className="text-red-600">*</span></Label>
              <Input
                id="store_name"
                name="store_name"
                value={formData.store_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_slug">Store Slug <span className="text-red-600">*</span></Label>
              <Input
                id="store_slug"
                name="store_slug"
                value={formData.store_slug}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Store Description </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>
          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email<span className="text-red-600">*</span></Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={handleInputChange}
                required              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone<span className="text-red-600">*</span></Label>
              <Input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                required
                value={formData.contact_phone}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Business Address */}
          <div className="space-y-2">
            <Label htmlFor="business_address">Business Address<span className="text-red-600">*</span></Label>
            <Textarea
              id="business_address"
              name="business_address"
              required
              value={formData.business_address}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          {/* Legal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tax_id">Tax ID</Label>
              <Input
                id="tax_id"
                name="tax_id"
                value={formData.tax_id}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_license">Business License</Label>
              <Input
                id="business_license"
                name="business_license"
                value={formData.business_license}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
