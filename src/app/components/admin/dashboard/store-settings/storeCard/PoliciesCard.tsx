// File: app/components/admin/dashboard/store-settings/storeCard/PoliciesCard.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PolicyBlock from "@/app/components/admin/dashboard/store-settings/PolicyBlock";
import { RichTextController } from "@/app/components/admin/dashboard/store-settings/storeCard/RichEditor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Lock,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Save,
  X,
  Info,
  Shield,
  Trash2,
} from "lucide-react";
import type { StoreSettings } from "@/lib/types/store/store";

interface PolicySectionProps {
  title: string;
  content: string;
  type: "terms" | "privacy";
  onEdit: (type: "terms" | "privacy", content: string, title: string) => void;
  onRemove: (type: "terms" | "privacy") => void;
}

function PolicySection({
  title,
  content,
  type,
  onEdit,
  onRemove,
}: PolicySectionProps) {
  const [expanded, setExpanded] = useState(false);
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const previewContent = expanded
    ? content
    : content.slice(0, 500) + (content.length > 500 ? "..." : "");

  const typeConfig = {
    terms: {
      icon: <FileText className="h-4 w-4" />,
      iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    privacy: {
      icon: <Lock className="h-4 w-4" />,
      iconClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
  };
  const cfg = typeConfig[type];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconClass}`}
          >
            {cfg.icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {wordCount.toLocaleString()} words
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(type, content, title)}
            className="h-7 px-2.5 text-xs font-medium gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(type)}
            className="h-7 px-2.5 text-xs font-medium gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </Button>
        </div>
      </div>

      <div
        className={`relative flex-1 overflow-hidden rounded-xl border border-border/50 bg-muted/10 transition-all duration-300 ${expanded ? "" : "max-h-36"}`}
      >
        <div className="p-3">
          <PolicyBlock title="" content={previewContent} compact={!expanded} />
        </div>
        {!expanded && content.length > 500 && (
          <div className="absolute bottom-0 inset-x-0 h-10 bg-linear-to-t from-muted/20 to-transparent pointer-events-none rounded-b-xl" />
        )}
      </div>

      {content.length > 500 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 self-center flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> Show less
            </>
          ) : (
            <>
              Read full <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

interface PoliciesCardProps {
  settings: StoreSettings;
  onUpdatePolicy: (type: "terms" | "privacy", content: string) => Promise<void>;
  onRemovePolicy?: (type: "terms" | "privacy") => Promise<void>;
}

export function PoliciesCard({
  settings,
  onUpdatePolicy,
  onRemovePolicy,
}: PoliciesCardProps) {
  const hasTerms = !!settings?.terms_and_conditions;
  const hasPrivacy = !!settings?.privacy_policy;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formType, setFormType] = useState<"terms" | "privacy">("terms");
  const [formData, setFormData] = useState({ title: "", content: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [removeType, setRemoveType] = useState<"terms" | "privacy" | null>(
    null,
  );
  const [isRemoving, setIsRemoving] = useState(false);

  const handleAddPolicy = (type: "terms" | "privacy") => {
    const defaultTitle =
      type === "terms" ? "Terms & Conditions" : "Privacy Policy";
    const existingContent =
      type === "terms"
        ? settings.terms_and_conditions
        : settings.privacy_policy;
    setFormType(type);
    setFormData({ title: defaultTitle, content: existingContent || "" });
    setIsDialogOpen(true);
  };

  const handleEditPolicy = (
    type: "terms" | "privacy",
    content: string,
    title: string,
  ) => {
    setFormType(type);
    setFormData({ title, content });
    setIsDialogOpen(true);
  };

  const handleSavePolicy = async () => {
    setIsSubmitting(true);
    try {
      await onUpdatePolicy(formType, formData.content);
      setIsDialogOpen(false);
      setFormData({ title: "", content: "" });
    } catch (err) {
      console.error("Failed to update policy:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePolicy = async () => {
    if (!removeType || !onRemovePolicy) return;
    setIsRemoving(true);
    try {
      await onRemovePolicy(removeType);
      setRemoveType(null);
    } catch (err) {
      console.error("Failed to remove policy:", err);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <Card className="border-0 shadow-sm bg-card ring-1 ring-border/60 overflow-hidden">
        <CardHeader className="px-5 py-4 border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-muted/60 flex items-center justify-center">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Store Policies
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Legal documents shown at checkout
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!hasTerms && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs font-medium gap-1.5 hover:bg-muted/50"
                  onClick={() => handleAddPolicy("terms")}
                >
                  <Plus className="h-3 w-3" /> Add Terms
                </Button>
              )}
              {!hasPrivacy && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs font-medium gap-1.5 hover:bg-muted/50"
                  onClick={() => handleAddPolicy("privacy")}
                >
                  <Plus className="h-3 w-3" /> Add Privacy Policy
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {hasTerms || hasPrivacy ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {hasTerms && (
                  <div className="p-4 rounded-xl border border-border/50 bg-card">
                    <PolicySection
                      title="Terms & Conditions"
                      content={settings.terms_and_conditions!}
                      type="terms"
                      onEdit={handleEditPolicy}
                      onRemove={(type) => setRemoveType(type)}
                    />
                  </div>
                )}
                {hasPrivacy && (
                  <div className="p-4 rounded-xl border border-border/50 bg-card">
                    <PolicySection
                      title="Privacy Policy"
                      content={settings.privacy_policy!}
                      type="privacy"
                      onEdit={handleEditPolicy}
                      onRemove={(type) => setRemoveType(type)}
                    />
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
                <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  These documents are automatically displayed during checkout.
                  Keep them current and compliant with local regulations.
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  No policies yet
                </p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs leading-relaxed">
                  Add Terms & Conditions and a Privacy Policy to build trust
                  with your customers.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5"
                  onClick={() => handleAddPolicy("terms")}
                >
                  <Plus className="h-3 w-3" /> Add Terms
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5"
                  onClick={() => handleAddPolicy("privacy")}
                >
                  <Plus className="h-3 w-3" /> Add Privacy Policy
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => !open && setIsDialogOpen(false)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div
                className={`h-7 w-7 rounded-lg flex items-center justify-center ${formType === "terms" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-violet-500/10 text-violet-600 dark:text-violet-400"}`}
              >
                {formType === "terms" ? (
                  <FileText className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </div>
              {formData.content ? "Edit" : "Create"}{" "}
              {formType === "terms" ? "Terms & Conditions" : "Privacy Policy"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {formType === "terms"
                ? "Define the rules and conditions for using your store"
                : "Specify how customer data is collected, used, and protected"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">
                  Content
                </Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formData.content.trim().split(/\s+/).filter(Boolean).length}{" "}
                  words
                </span>
              </div>
              <div className="min-h-64 sm:min-h-96">
                <RichTextController
                  value={formData.content}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, content: value }))
                  }
                />
              </div>
            </div>

            <div
              className={`rounded-xl p-3 border text-sm leading-relaxed ${formType === "terms" ? "bg-blue-50/50 border-blue-100 text-blue-700 dark:bg-blue-900/10 dark:border-blue-900/30 dark:text-blue-400" : "bg-violet-50/50 border-violet-100 text-violet-700 dark:bg-violet-900/10 dark:border-violet-900/30 dark:text-violet-400"}`}
            >
              <strong>Tip: </strong>
              {formType === "terms"
                ? "Include: user responsibilities, payment terms, shipping policy, returns & refunds, and liability limitations."
                : "Include: what data you collect, how it's used, third-party sharing, and how users can manage their data."}
            </div>
          </div>

          <DialogFooter className="border-t pt-4 gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
              className="h-9 px-4 text-sm"
            >
              <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
            </Button>
            <Button
              onClick={handleSavePolicy}
              disabled={isSubmitting || !formData.content.trim()}
              className="h-9 px-4 text-sm gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⟳</span> Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" /> Save Policy
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Remove Confirmation Dialog */}
      <Dialog
        open={!!removeType}
        onOpenChange={(open) => !open && setRemoveType(null)}
      >
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Remove{" "}
              {removeType === "terms" ? "Terms & Conditions" : "Privacy Policy"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              This will permanently remove your{" "}
              <strong>
                {removeType === "terms"
                  ? "Terms & Conditions"
                  : "Privacy Policy"}
              </strong>{" "}
              from your store. Customers will no longer see it at checkout. You
              can add it back at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setRemoveType(null)}
              disabled={isRemoving}
              className="h-9 px-4 text-sm"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemovePolicy}
              disabled={isRemoving}
              className="h-9 px-4 text-sm gap-1.5"
            >
              {isRemoving ? (
                <>
                  <span className="animate-spin">⟳</span> Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
