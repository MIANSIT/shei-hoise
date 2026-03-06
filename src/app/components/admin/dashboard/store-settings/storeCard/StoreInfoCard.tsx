// File: app/components/admin/dashboard/store-settings/storeCard/StoreInfoCard.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Calendar,
  Pencil,
  Copy,
  X,
  Check,
  AlignLeft,
} from "lucide-react";
import type { StoreData, UpdatedStoreData } from "@/lib/types/store/store";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  editing?: boolean;
  onChange?: (val: string) => void;
  onCopy?: () => void;
  multiline?: boolean;
  placeholder?: string;
}

function InfoItem({
  icon,
  label,
  value,
  editing,
  onChange,
  onCopy,
  multiline = false,
  placeholder,
}: InfoItemProps) {
  return (
    <div className="group flex items-start gap-3 py-3.5 px-3 rounded-xl hover:bg-muted/30 transition-colors duration-150">
      <div className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-muted-foreground mb-1">
          {label}
        </p>
        {editing ? (
          multiline ? (
            <textarea
              value={value || ""}
              onChange={(e) => onChange?.(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 px-3 py-2 rounded-lg resize-none text-sm transition-all outline-none text-foreground placeholder:text-muted-foreground"
              rows={3}
            />
          ) : (
            <input
              type="text"
              value={value || ""}
              onChange={(e) => onChange?.(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 px-3 py-2 rounded-lg text-sm transition-all outline-none text-foreground placeholder:text-muted-foreground"
            />
          )
        ) : (
          <p
            className={`text-sm wrap-break-word whitespace-pre-wrap ${
              value
                ? "text-foreground font-medium"
                : "text-muted-foreground italic"
            }`}
          >
            {value || `No ${label.toLowerCase()} added`}
          </p>
        )}
      </div>
      {!editing && onCopy && value && (
        <button
          onClick={onCopy}
          className="opacity-0 group-hover:opacity-100 mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
          title="Copy"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

interface StoreInfoCardProps {
  store: StoreData;
  onUpdate: (data: UpdatedStoreData) => Promise<void>;
}

export function StoreInfoCard({ store, onUpdate }: StoreInfoCardProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const notify = useSheiNotification();

  const [formData, setFormData] = useState({
    description: store.description || "",
    contact_email: store.contact_email || "",
    contact_phone: store.contact_phone || "",
    business_address: store.business_address || "",
    tax_id: store.tax_id || "",
    business_license: store.business_license || "",
  });

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onUpdate(formData);
      setEditing(false);
      notify.success("Store information updated!");
    } catch (err) {
      console.error(err);
      notify.error("Failed to update store information.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      description: store.description || "",
      contact_email: store.contact_email || "",
      contact_phone: store.contact_phone || "",
      business_address: store.business_address || "",
      tax_id: store.tax_id || "",
      business_license: store.business_license || "",
    });
    setEditing(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    notify.success(`${label} copied!`);
  };

  return (
    <Card className="border-0 shadow-sm bg-card ring-1 ring-border/60 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Store Information
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Contact details & business identifiers
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
                {loading ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs font-medium gap-1.5"
                onClick={handleCancel}
                disabled={loading}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
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
              Edit
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-2.5">
        <div className="space-y-0">
          {/* Description — shown first, full width feel */}
          <InfoItem
            icon={<AlignLeft className="h-4 w-4" />}
            label="Store Description"
            value={formData.description}
            editing={editing}
            onChange={(v) => handleChange("description", v)}
            multiline
            placeholder="Tell customers what your store is about..."
          />

          {/* Divider between description and contact fields */}
          <div className="mx-3 border-t border-border/40 my-1" />

          <InfoItem
            icon={<Mail className="h-4 w-4" />}
            label="Contact Email"
            value={formData.contact_email}
            editing={editing}
            onChange={(v) => handleChange("contact_email", v)}
            onCopy={() => copyToClipboard(formData.contact_email, "Email")}
            placeholder="contact@yourstore.com"
          />
          <InfoItem
            icon={<Phone className="h-4 w-4" />}
            label="Contact Phone"
            value={formData.contact_phone}
            editing={editing}
            onChange={(v) => handleChange("contact_phone", v)}
            onCopy={() => copyToClipboard(formData.contact_phone, "Phone")}
            placeholder="+1 (555) 000-0000"
          />
          <InfoItem
            icon={<MapPin className="h-4 w-4" />}
            label="Business Address"
            value={formData.business_address}
            editing={editing}
            onChange={(v) => handleChange("business_address", v)}
            multiline
            placeholder="123 Business St, City, State, Country"
          />

          {/* Divider before legal/tax fields */}
          <div className="mx-3 border-t border-border/40 my-1" />

          <InfoItem
            icon={<CreditCard className="h-4 w-4" />}
            label="Tax ID"
            value={formData.tax_id}
            editing={editing}
            onChange={(v) => handleChange("tax_id", v)}
            onCopy={() => copyToClipboard(formData.tax_id, "Tax ID")}
            placeholder="XX-XXXXXXX"
          />
          <InfoItem
            icon={<FileText className="h-4 w-4" />}
            label="Business License"
            value={formData.business_license}
            editing={editing}
            onChange={(v) => handleChange("business_license", v)}
            onCopy={() => copyToClipboard(formData.business_license, "License")}
            placeholder="License number"
          />
        </div>
      </CardContent>

      {store.created_at && (
        <div className="px-5 py-3 border-t border-border bg-muted/10">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Store registered{" "}
            {new Date(store.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
