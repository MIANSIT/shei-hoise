"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PolicyBlock from "@/app/components/admin/dashboard/store-settings/PolicyBlock";
import { RichTextController } from "@/app/components/admin/dashboard/store-settings/store/RichEditor";
import { FileText, ShieldCheck, Edit } from "lucide-react";
import type { PolicyType } from "@/lib/types/store/store"; // Use correct path
interface PolicyCardProps {
  title: string;
  content: string;
  iconType: PolicyType;
  onSave?: (content: string) => Promise<void>;
}

export default function PolicyCard({
  title,
  content,
  iconType,
  onSave,
}: PolicyCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [isLoading, setIsLoading] = useState(false);
  const [isContentChanged, setIsContentChanged] = useState(false);

  const iconConfig = {
    terms: {
      icon: FileText,
      bgColor: "bg-indigo-100",
      iconColor: "text-indigo-600",
      modalTitle: "Edit Terms & Conditions",
    },
    privacy: {
      icon: ShieldCheck,
      bgColor: "bg-pink-100",
      iconColor: "text-pink-600",
      modalTitle: "Edit Privacy Policy",
    },
  };

  const { icon: Icon, bgColor, iconColor, modalTitle } = iconConfig[iconType];

  const handleContentChange = (val: string) => {
    setEditedContent(val);
    setIsContentChanged(val !== content);
  };

  const handleSave = async () => {
    console.log(`Saving ${title}:`, editedContent);

    setIsLoading(true);
    try {
      if (onSave) {
        await onSave(editedContent);
      }
      setIsEditModalOpen(false);
      setIsContentChanged(false);
    } catch (error) {
      console.error(`Error updating ${title}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsContentChanged(false);
    setIsEditModalOpen(false);
  };

  const handleEditClick = () => {
    setEditedContent(content);
    setIsContentChanged(false);
    setIsEditModalOpen(true);
  };

  return (
    <>
      <Card className="rounded-2xl border border-gray-200/70 bg-white hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${bgColor} rounded-lg`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            </div>
          </div>
          <PolicyBlock title="" content={content} compact={true} />
          <div className="mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={handleEditClick}
              className="w-full py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit {title}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={handleCancel}>
        <DialogContent className="max-w-7xl max-h-screen overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Icon className={`w-6 h-6 ${iconColor}`} />
              {modalTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <div className="h-full border border-gray-300 rounded-lg overflow-hidden">
              <RichTextController
                value={editedContent}
                onChange={handleContentChange}
              />
            </div>
          </div>

          <DialogFooter className="mt-4 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isLoading || !isContentChanged}
              className={`${
                iconType === "terms"
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-pink-600 hover:bg-pink-700"
              }`}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
