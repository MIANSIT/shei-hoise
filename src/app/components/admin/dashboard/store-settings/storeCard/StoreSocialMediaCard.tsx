// File: app/components/admin/dashboard/store-settings/storeCard/StoreSocialMediaCard.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X, Copy, ExternalLink, Link2 } from "lucide-react";
import {
  FacebookOutlined,
  InstagramOutlined,
  TwitterOutlined,
  YoutubeOutlined,
} from "@ant-design/icons";
import type {
  StoreSocialMedia,
  UpdatedStoreSocialMedia,
} from "@/lib/types/store/store";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

interface Props {
  socialMedia: StoreSocialMedia | null;
  onUpdate: (data: UpdatedStoreSocialMedia) => Promise<void>;
}

const PLATFORMS = [
  {
    key: "facebook" as const,
    label: "Facebook",
    Icon: FacebookOutlined,
    color: "#1877F2",
    bgClass: "bg-[#1877F2]/10",
    iconColor: "text-[#1877F2]",
    borderActive: "ring-[#1877F2]/20",
    placeholder: "https://facebook.com/your-page",
  },
  {
    key: "instagram" as const,
    label: "Instagram",
    Icon: InstagramOutlined,
    color: "#E1306C",
    bgClass: "bg-[#E1306C]/10",
    iconColor: "text-[#E1306C]",
    borderActive: "ring-[#E1306C]/20",
    placeholder: "https://instagram.com/your-handle",
  },
  {
    key: "twitter" as const,
    label: "X / Twitter",
    Icon: TwitterOutlined,
    color: "#1DA1F2",
    bgClass: "bg-[#1DA1F2]/10",
    iconColor: "text-[#1DA1F2]",
    borderActive: "ring-[#1DA1F2]/20",
    placeholder: "https://x.com/your-handle",
  },
  {
    key: "youtube" as const,
    label: "YouTube",
    Icon: YoutubeOutlined,
    color: "#FF0000",
    bgClass: "bg-[#FF0000]/10",
    iconColor: "text-[#FF0000]",
    borderActive: "ring-[#FF0000]/20",
    placeholder: "https://youtube.com/@your-channel",
  },
] as const;

export function StoreSocialMediaCard({ socialMedia, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const notify = useSheiNotification();

  const [formData, setFormData] = useState<Record<string, string>>({
    facebook_link: "",
    instagram_link: "",
    twitter_link: "",
    youtube_link: "",
  });

  useEffect(() => {
    setFormData({
      facebook_link: socialMedia?.facebook_link ?? "",
      instagram_link: socialMedia?.instagram_link ?? "",
      twitter_link: socialMedia?.twitter_link ?? "",
      youtube_link: socialMedia?.youtube_link ?? "",
    });
  }, [socialMedia]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const normalizeFormData = (): UpdatedStoreSocialMedia => ({
    facebook_link: formData.facebook_link.trim() || null,
    instagram_link: formData.instagram_link.trim() || null,
    twitter_link: formData.twitter_link.trim() || null,
    youtube_link: formData.youtube_link.trim() || null,
  });

  const isValidUrl = (url: string) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      for (const [key, value] of Object.entries(formData)) {
        if (!isValidUrl(value)) {
          notify.error(`Invalid URL for ${key.replace("_link", "")}`);
          setLoading(false);
          return;
        }
      }
      await onUpdate(normalizeFormData());
      setEditing(false);
      notify.success("Social media links updated!");
    } catch (err) {
      console.error(err);
      notify.error("Failed to update social media links.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      facebook_link: socialMedia?.facebook_link ?? "",
      instagram_link: socialMedia?.instagram_link ?? "",
      twitter_link: socialMedia?.twitter_link ?? "",
      youtube_link: socialMedia?.youtube_link ?? "",
    });
    setEditing(false);
  };

  const connectedCount = PLATFORMS.filter(
    (p) => !!formData[`${p.key}_link`]?.trim(),
  ).length;

  return (
    <Card className="border-0 shadow-sm bg-card ring-1 ring-border/60 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-muted/60 flex items-center justify-center">
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Social Media
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {connectedCount > 0
                  ? `${connectedCount} of ${PLATFORMS.length} connected`
                  : "No profiles connected yet"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button
                  size="sm"
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
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs font-medium gap-1.5 hover:bg-muted/50"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLATFORMS.map(
            ({
              key,
              label,
              Icon,
              bgClass,
              iconColor,
              borderActive,
              placeholder,
            }) => {
              const link = formData[`${key}_link`];
              const hasLink = !!link?.trim();

              return (
                <div
                  key={key}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    hasLink
                      ? `ring-1 ${borderActive} border-border/40 bg-muted/10`
                      : "border-border/50 bg-muted/5 hover:bg-muted/15"
                  }`}
                >
                  <div className="p-3.5">
                    {/* Platform header */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div
                        className={`h-8 w-8 rounded-lg ${bgClass} flex items-center justify-center shrink-0`}
                      >
                        <Icon
                          className={iconColor}
                          style={{ fontSize: "15px" }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-foreground flex-1">
                        {label}
                      </span>
                      {hasLink && !editing && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Live
                        </span>
                      )}
                    </div>

                    {editing ? (
                      <div>
                        <input
                          type="url"
                          placeholder={placeholder}
                          value={link}
                          onChange={(e) =>
                            handleChange(`${key}_link`, e.target.value)
                          }
                          className="w-full bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 px-3 py-2 rounded-lg text-xs outline-none text-foreground placeholder:text-muted-foreground transition-all"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Leave empty to disconnect
                        </p>
                      </div>
                    ) : hasLink ? (
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-muted-foreground truncate flex-1 font-mono">
                          {link!.length > 38
                            ? `${link!.substring(0, 38)}…`
                            : link}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(link!);
                              notify.success("Copied!");
                            }}
                            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                            title="Copy"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() =>
                              window.open(
                                link!,
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                            title="Open"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Not connected
                      </p>
                    )}
                  </div>
                </div>
              );
            },
          )}
        </div>
      </CardContent>
    </Card>
  );
}
