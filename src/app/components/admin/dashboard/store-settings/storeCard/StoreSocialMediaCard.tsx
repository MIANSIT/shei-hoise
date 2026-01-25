"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  CopyOutlined,
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
    color: "text-blue-600",
  },
  {
    key: "instagram" as const,
    label: "Instagram",
    Icon: InstagramOutlined,
    color: "text-pink-600",
  },
  {
    key: "twitter" as const,
    label: "Twitter",
    Icon: TwitterOutlined,
    color: "text-sky-500",
  },
  {
    key: "youtube" as const,
    label: "YouTube",
    Icon: YoutubeOutlined,
    color: "text-red-600",
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

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Normalize: empty string → null
  const normalizeFormData = (): UpdatedStoreSocialMedia => ({
    facebook_link: formData.facebook_link.trim() || null,
    instagram_link: formData.instagram_link.trim() || null,
    twitter_link: formData.twitter_link.trim() || null,
    youtube_link: formData.youtube_link.trim() || null,
  });

  // Only validate non-empty URLs
  const isValidUrl = (url: string) => {
    if (!url) return true; // empty allowed
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
      // Validate each non-empty link
      for (const [key, value] of Object.entries(formData)) {
        if (!isValidUrl(value)) {
          notify.error(`Invalid URL for ${key.replace("_link", "")}`);
          setLoading(false);
          return;
        }
      }

      await onUpdate(normalizeFormData());
      setEditing(false);
      notify.success("Social media links updated successfully!");
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => notify.success("Copied to clipboard!"));
  };

  const openLink = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer");

  return (
    <Card className="w-full max-w-4xl mx-auto border shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 sm:p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-black dark:text-white">
              Social Media Links
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1 dark:text-gray-300">
              Manage your store&apos;s social media profiles
            </p>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {editing ? (
            <>
              <Button
                size="sm"
                className="flex items-center gap-2 px-4 py-2 text-sm"
                onClick={handleSubmit}
                disabled={loading}
              >
                <CheckOutlined className="h-4 w-4" />
                <span className="hidden sm:inline">Save Changes</span>
                <span className="inline sm:hidden">Save</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2 px-4 py-2 text-sm"
                onClick={handleCancel}
                disabled={loading}
              >
                <CloseOutlined className="h-4 w-4" />
                <span className="hidden sm:inline">Cancel</span>
                <span className="inline sm:hidden">Cancel</span>
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="flex items-center gap-2 px-4 py-2 text-sm"
              onClick={() => setEditing(true)}
            >
              <EditOutlined className="h-4 w-4" />
              <span className="hidden sm:inline">Edit Links</span>
              <span className="inline sm:hidden">Edit</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {PLATFORMS.map(({ key, label, Icon, color }) => {
            const link = formData[`${key}_link`];
            const isLinkValid = !!link?.trim();

            return (
              <div
                key={key}
                className="border rounded-lg p-4 hover:shadow-sm transition-shadow duration-200"
              >
                <div className="flex items-center gap-1 mb-3">
                  <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                    <Icon className="h-5" />
                  </div>
                  <span className="font-semibold text-primary">{label}</span>
                </div>

                {editing ? (
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600 dark:text-gray-300 block">
                      {label} URL
                    </label>
                    <input
                      type="text"
                      placeholder={`https://${key}.com/your-profile`}
                      value={link}
                      onChange={(e) =>
                        handleChange(`${key}_link`, e.target.value)
                      }
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500">
                      Leave empty to remove the link
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        {isLinkValid ? (
                          <button
                            onClick={() => openLink(link!)}
                            className="text-blue-600 hover:text-blue-800 hover:underline break-all text-left text-sm sm:text-base"
                          >
                            {link!.length > 40
                              ? `${link!.substring(0, 40)}...`
                              : link}
                          </button>
                        ) : (
                          <span className="text-gray-400 italic text-sm">
                            No link added
                          </span>
                        )}
                      </div>

                      {isLinkValid && (
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(link!)}
                            title="Copy to clipboard"
                          >
                            <CopyOutlined className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {!isLinkValid && (
                      <p className="text-sm text-gray-500">
                        Add your {label} profile link to connect with customers
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {editing && (
          <div className="flex flex-col sm:hidden gap-2 mt-6 pt-6 border-t">
            <Button
              className="w-full py-3"
              onClick={handleSubmit}
              disabled={loading}
            >
              <CheckOutlined className="h-4 w-4 mr-2" /> Save All Changes
            </Button>
            <Button
              variant="outline"
              className="w-full py-3"
              onClick={handleCancel}
              disabled={loading}
            >
              <CloseOutlined className="h-4 w-4 mr-2" /> Discard Changes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
