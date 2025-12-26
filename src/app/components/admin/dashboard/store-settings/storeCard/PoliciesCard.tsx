"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PolicyBlock from "@/app/components/admin/dashboard/store-settings/PolicyBlock";
import { RichTextController } from "@/app/components/admin/dashboard/store-settings/store/RichEditor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { StoreSettings } from "@/lib/types/store/store";

import {
  FileTextOutlined,
  LockOutlined,
  DownOutlined,
  UpOutlined,
  PlusOutlined,
  EditOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  CloseOutlined,
} from "@ant-design/icons";

interface PolicySectionProps {
  title: string;
  content: string;
  type: "terms" | "privacy";
  onEdit: (type: "terms" | "privacy", content: string, title: string) => void;
}

function PolicySection({ title, content, type, onEdit }: PolicySectionProps) {
  const [expanded, setExpanded] = useState(false);
  const wordCount = content.split(/\s+/).length;
  const previewContent = expanded
    ? content
    : content.slice(0, 500) + (content.length > 500 ? "..." : "");

  return (
    <div className="space-y-4">
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              type === "terms"
                ? "bg-blue-500/10 text-blue-600"
                : "bg-purple-500/10 text-purple-600"
            }`}
          >
            {type === "terms" ? <FileTextOutlined /> : <LockOutlined />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-lg truncate">{title}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <Badge variant="outline" className="text-xs">
                {wordCount} words
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end xs:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full xs:w-auto"
          >
            {expanded ? (
              <>
                <UpOutlined className="mr-2" />
                <span className="hidden xs:inline">Show Less</span>
                <span className="xs:hidden">Less</span>
              </>
            ) : (
              <>
                <DownOutlined className="mr-2" />
                <span className="hidden xs:inline">Read More</span>
                <span className="xs:hidden">More</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div
        className={`transition-all duration-300 ${
          expanded ? "" : "max-h-[200px] overflow-hidden"
        }`}
      >
        <PolicyBlock
          title=""
          content={expanded ? content : previewContent}
          compact={!expanded}
        />
      </div>

      <div className="flex flex-col xs:flex-row justify-end pt-4 border-t gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(type, content, title)}
          className="w-full xs:w-auto"
        >
          <EditOutlined className="mr-2" />
          Edit
        </Button>
      </div>
    </div>
  );
}

interface PolicyFormData {
  title: string;
  content: string;
}

export function PoliciesCard({ settings }: { settings: StoreSettings }) {
  const hasTerms = !!settings.terms_and_conditions;
  const hasPrivacy = !!settings.privacy_policy;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formType, setFormType] = useState<"terms" | "privacy">("terms");
  const [formData, setFormData] = useState<PolicyFormData>({
    title: "",
    content: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddPolicy = (type: "terms" | "privacy") => {
    const defaultTitle =
      type === "terms" ? "Terms & Conditions" : "Privacy Policy";
    const existingContent =
      type === "terms"
        ? settings.terms_and_conditions
        : settings.privacy_policy;

    setFormType(type);
    setFormData({
      title: defaultTitle,
      content: existingContent || "",
    });
    setIsDialogOpen(true);
  };

  const handleEditPolicy = (
    type: "terms" | "privacy",
    content: string,
    title: string
  ) => {
    setFormType(type);
    setFormData({
      title,
      content,
    });
    setIsDialogOpen(true);
  };

  const handleSavePolicy = async () => {
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Saving policy:", {
        type: formType,
        data: formData,
      });

      // Refresh data or update local state here
      setIsDialogOpen(false);
      setFormData({ title: "", content: "" });
    } catch (error) {
      console.error("Failed to save policy:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRichTextChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      content: value,
    }));
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      title: e.target.value,
    }));
  };

  if (!hasTerms && !hasPrivacy) {
    return (
      <>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Store Policies
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              No policies configured yet
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 md:py-8">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <FileTextOutlined className="text-2xl md:text-3xl text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-6 px-4 md:px-0">
                Add terms and privacy policy to build customer trust
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 px-4 sm:px-0">
                <Button
                  onClick={() => handleAddPolicy("privacy")}
                  className="w-full sm:w-auto"
                >
                  <PlusOutlined className="mr-2" />
                  <span className="hidden xs:inline">Add Privacy Policy</span>
                  <span className="xs:hidden">Privacy Policy</span>
                </Button>
                <Button
                  onClick={() => handleAddPolicy("terms")}
                  className="w-full sm:w-auto"
                >
                  <PlusOutlined className="mr-2" />
                  <span className="hidden xs:inline">
                    Add Terms & Conditions
                  </span>
                  <span className="xs:hidden">Terms & Conditions</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Policy Editor Dialog */}
        <PolicyEditorDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          type={formType}
          formData={formData}
          isSubmitting={isSubmitting}
          onTitleChange={handleTitleChange}
          onRichTextChange={handleRichTextChange}
          onSave={handleSavePolicy}
        />
      </>
    );
  }

  return (
    <>
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl font-semibold">
                Store Policies
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Legal documents that protect your business and customers
              </p>
            </div>
            <div className="flex flex-col xs:flex-row flex-wrap gap-2 w-full md:w-auto">
              {!hasTerms && (
                <Button
                  className="w-full xs:w-auto"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddPolicy("terms")}
                >
                  <PlusOutlined className="mr-2" />
                  <span className="hidden sm:inline">Add Terms</span>
                  <span className="sm:hidden">Terms</span>
                </Button>
              )}

              {!hasPrivacy && (
                <Button
                  className="w-full xs:w-auto"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddPolicy("privacy")}
                >
                  <PlusOutlined className="mr-2" />
                  <span className="hidden sm:inline">Add Privacy</span>
                  <span className="sm:hidden">Privacy</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 md:space-y-8">
          {/* Responsive layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {hasTerms && (
              <div className="p-3 sm:p-4 rounded-lg border bg-card/50 h-full">
                <PolicySection
                  title="Terms & Conditions"
                  content={settings.terms_and_conditions!}
                  type="terms"
                  onEdit={handleEditPolicy}
                />
              </div>
            )}

            {hasPrivacy && (
              <div className="p-3 sm:p-4 rounded-lg border bg-card/50 h-full">
                <PolicySection
                  title="Privacy Policy"
                  content={settings.privacy_policy!}
                  type="privacy"
                  onEdit={handleEditPolicy}
                />
              </div>
            )}
          </div>

          {(hasTerms || hasPrivacy) && (
            <div className="rounded-lg bg-muted/30 p-3 sm:p-4 border">
              <div className="flex items-start gap-3">
                <InfoCircleOutlined className="text-primary w-4 h-4 sm:w-5 sm:h-5 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground text-sm sm:text-base">
                    Policy Requirements
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                    These Terms or Policies are automatically displayed during
                    checkout. Make sure they comply with local regulations and
                    are regularly updated.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policy Editor Dialog */}
      <PolicyEditorDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        type={formType}
        formData={formData}
        isSubmitting={isSubmitting}
        onTitleChange={handleTitleChange}
        onRichTextChange={handleRichTextChange}
        onSave={handleSavePolicy}
      />
    </>
  );
}

interface PolicyEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: "terms" | "privacy";
  formData: PolicyFormData;
  isSubmitting: boolean;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRichTextChange: (value: string) => void;
  onSave: () => void;
}

function PolicyEditorDialog({
  isOpen,
  onClose,
  type,
  formData,
  isSubmitting,
  onTitleChange,
  onRichTextChange,
  onSave,
}: PolicyEditorDialogProps) {
  const getDialogTitle = () => {
    if (formData.content) {
      return `Edit ${
        type === "terms" ? "Terms & Conditions" : "Privacy Policy"
      }`;
    }
    return `Add ${type === "terms" ? "Terms & Conditions" : "Privacy Policy"}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            {type === "terms" ? (
              <FileTextOutlined className="text-blue-600" />
            ) : (
              <LockOutlined className="text-purple-600" />
            )}
            <span className="truncate">{getDialogTitle()}</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            {type === "terms"
              ? "Define the terms and conditions for using your store"
              : "Specify how customer data is collected and used"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 ">
          <div className="space-y-2">
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
              <Label htmlFor="policy-content" className="text-sm sm:text-base">
                Legal Content
              </Label>
              <Badge variant="outline" className="text-xs w-fit">
                {formData.content.split(/\s+/).length} words
              </Badge>
            </div>
            <div className="min-h-[300px] sm:min-h-[400px]">
              <RichTextController
                value={formData.content}
                onChange={onRichTextChange}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use the toolbar above to format your text. Changes are saved
              automatically as you type.
            </p>
          </div>

          <div
            className={`rounded-lg p-3 sm:p-4 border ${
              type === "terms"
                ? "bg-blue-50 border-blue-200"
                : "bg-purple-50 border-purple-200"
            }`}
          >
            <p
              className={`text-xs sm:text-sm ${
                type === "terms" ? "text-blue-800" : "text-purple-800"
              }`}
            >
              <strong>
                Tip for{" "}
                {type === "terms" ? "Terms & Conditions" : "Privacy Policy"}:
              </strong>{" "}
              {type === "terms"
                ? "Include sections on user responsibilities, payment terms, shipping policies, returns & refunds, and liability limitations."
                : "Clearly state what data you collect, how it's used, who it's shared with, and how users can control their data."}
            </p>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 flex flex-col-reverse sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            <CloseOutlined className="mr-2" />
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isSubmitting || !formData.content.trim()}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Saving...
              </>
            ) : (
              <>
                <SaveOutlined className="mr-2" />
                Save Policy
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
