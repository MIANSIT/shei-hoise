"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  FileTextOutlined,
  CalendarOutlined,
  EditOutlined,
  CopyOutlined,
  CloseOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import type { StoreData, UpdatedStoreData } from "@/lib/types/store/store";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  editing?: boolean;
  onChange?: (val: string) => void;
  action?: React.ReactNode;
  className?: string;
  isHighlighted?: boolean;
  multiline?: boolean;
}

function InfoItem({
  icon,
  label,
  value,
  editing,
  onChange,
  action,
  className,
  isHighlighted,
  multiline = false,
}: InfoItemProps) {
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg transition-colors group ${
        isHighlighted
          ? "bg-secondary/5 border border-primary/10"
          : "hover:bg-muted/50"
      } ${className}`}
    >
      <div className="mt-1 p-2 rounded-md bg-primary/10 text-primary text-lg shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground mb-1">
          {label}
        </p>
        {editing ? (
          multiline ? (
            <textarea
              value={value || ""}
              onChange={(e) => onChange && onChange(e.target.value)}
              className="w-full border px-3 py-2 rounded resize-none text-sm sm:text-base"
              rows={3}
            />
          ) : (
            <input
              type="text"
              value={value || ""}
              onChange={(e) => onChange && onChange(e.target.value)}
              className="w-full border px-3 py-2 rounded text-sm sm:text-base"
            />
          )
        ) : (
          <p className="text-base font-semibold break-all word-break-break-word overflow-wrap-break-word">
            {value}
          </p>
        )}
      </div>
      {action && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {action}
        </div>
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
      notify.success("Store information updated successfully!");
    } catch (err) {
      console.error("Failed to update store info:", err);
       notify.error("Failed to update store information.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      contact_email: store.contact_email || "",
      contact_phone: store.contact_phone || "",
      business_address: store.business_address || "",
      tax_id: store.tax_id || "",
      business_license: store.business_license || "",
    });
    setEditing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="border-b p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <CardTitle className="text-lg sm:text-xl font-semibold">
            Store Information
          </CardTitle>

          {editing ? (
            <div className="flex gap-2 justify-center sm:justify-end w-full sm:w-auto mt-2 sm:mt-0">
              <Button
                size="sm"
                variant="default"
                className="h-9 px-4 flex-1 sm:flex-none min-w-25"
                onClick={handleSubmit}
                disabled={loading}
              >
                <CheckOutlined className="mr-2 text-sm" />
                <span>{loading ? "Updating..." : "Submit"}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-4 flex-1 sm:flex-none min-w-25"
                onClick={handleCancel}
                disabled={loading}
              >
                <CloseOutlined className="mr-2 text-sm" />
                <span>Close</span>
              </Button>
            </div>
          ) : (
            <div className="flex justify-center sm:justify-end w-full sm:w-auto mt-2 sm:mt-0">
              <Button
                variant="default"
                size="sm"
                className="h-9 px-4 w-full sm:w-auto min-w-30"
                onClick={() => setEditing(true)}
              >
                <EditOutlined className="mr-2 text-sm" />
                <span>Edit Info</span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 grid grid-cols-1 gap-3 sm:gap-4">
        <InfoItem
          icon={<MailOutlined />}
          label="Contact Email"
          value={formData.contact_email}
          editing={editing}
          onChange={(val) => handleChange("contact_email", val)}
          action={
            !editing && (
              <Button
                variant="ghost"
                size="icon"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(formData.contact_email)}
                className="h-8 w-8"
              />
            )
          }
          isHighlighted
        />

        <InfoItem
          icon={<PhoneOutlined />}
          label="Contact Phone"
          value={formData.contact_phone}
          editing={editing}
          onChange={(val) => handleChange("contact_phone", val)}
          isHighlighted
        />

        <InfoItem
          icon={<EnvironmentOutlined />}
          label="Business Address"
          value={formData.business_address}
          editing={editing}
          onChange={(val) => handleChange("business_address", val)}
          isHighlighted
          multiline
        />

        <InfoItem
          icon={<IdcardOutlined />}
          label="Tax ID"
          value={formData.tax_id}
          editing={editing}
          onChange={(val) => handleChange("tax_id", val)}
          isHighlighted
        />

        <InfoItem
          icon={<FileTextOutlined />}
          label="Business License"
          value={formData.business_license}
          editing={editing}
          onChange={(val) => handleChange("business_license", val)}
          isHighlighted
        />
      </CardContent>

      {store.created_at && (
        <div className="mt-2 px-4 pb-3 text-xs text-muted-foreground italic flex justify-end items-center gap-1">
          <CalendarOutlined className="text-[10px]" />
          <span>{new Date(store.created_at).toLocaleDateString()}</span>
        </div>
      )}
    </Card>
  );
}
