/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef } from "react";
import { useZodForm } from "@/lib/utils/useZodForm";
import {
  createCategorySchema,
  type CreateCategoryType,
} from "@/lib/schema/category.schema";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import type { Category } from "@/lib/types/category";
import FormField from "@/app/components/admin/dashboard/products/addProducts/FormField";

interface AddCategoryCardFormProps {
  onSubmit?: (data: CreateCategoryType) => Promise<void> | void;
  editingCategory?: (CreateCategoryType & { id?: string }) | Category | null;
  onSuccess?: () => void;
  allCategories?: Category[]; // kept in interface for compatibility, not used
}

export default function AddCategoryCardForm({
  onSubmit,
  editingCategory = null,
  onSuccess,
}: AddCategoryCardFormProps) {
  const toast = useSheiNotification();

  // Track whether the form was JUST populated by editingCategory reset.
  // We skip one slug-sync cycle after reset so we don't overwrite
  // the incoming slug, but allow all subsequent name changes to sync.
  const justResetRef = useRef(false);

  const form = useZodForm<CreateCategoryType>(createCategorySchema, {
    name: "",
    slug: "",
    description: "",
    parent_id: null as any,
    is_active: true,
  });

  const {
    formState: { isSubmitting },
  } = form;
  const nameValue = form.watch("name");
  const isActiveValue = form.watch("is_active");

  // ── Populate form when editing ──────────────────────────────────
  useEffect(() => {
    if (editingCategory) {
      justResetRef.current = true; // flag: next slug-sync should be skipped
      form.reset({
        name: (editingCategory as any).name ?? "",
        slug: (editingCategory as any).slug ?? "",
        description: (editingCategory as any).description ?? "",
        parent_id:
          (editingCategory as any).parent_id ??
          (editingCategory as any).parentId ??
          null,
        is_active: (editingCategory as any).is_active ?? true,
      });
    }
  }, [editingCategory, form]);

  // ── Auto-generate slug from name ────────────────────────────────
  // Works for both create AND edit:
  //   • On create:  always generates from name.
  //   • On edit:    skips the first fire (right after reset), then
  //                 re-generates whenever the user actually changes the name.
  useEffect(() => {
    if (justResetRef.current) {
      // Skip this one cycle — the slug was just set by reset()
      justResetRef.current = false;
      return;
    }
    const slug = nameValue
      ? nameValue
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
      : "";
    form.setValue("slug", slug, { shouldValidate: true });
  }, [nameValue, form]);

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async (data: CreateCategoryType) => {
    const normalized: CreateCategoryType = {
      ...data,
      parent_id:
        data.parent_id === "" || data.parent_id === undefined
          ? null
          : (data.parent_id as any),
    };
    try {
      if (onSubmit) {
        await onSubmit(normalized);
      } else {
        toast.info("No submission handler provided.");
      }
      onSuccess?.();
      form.reset();
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast.error(
        error?.message ?? "Failed to save category. Please try again.",
      );
    }
  };

  return (
    <div
      className="bg-white dark:bg-[#16181f]
                    border border-gray-200 dark:border-[#2a2d3a]
                    rounded-2xl overflow-hidden"
    >
      {/* ── Form header ── */}
      <div
        className="px-4 sm:px-5 py-3 sm:py-4
                      border-b border-gray-100 dark:border-[#2a2d3a]
                      bg-gray-50 dark:bg-[#13151d]"
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500 mb-0.5">
          {editingCategory ? "Editing" : "New"}
        </p>
        <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
          {editingCategory ? (editingCategory as any).name : "Create Category"}
        </h2>
      </div>

      {/* ── Fields ── */}
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="p-4 sm:p-5 space-y-3 sm:space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          label="Name"
          placeholder="e.g. Electronics"
          required
          tooltip="Enter the official name of the category."
        />

        <FormField
          control={form.control}
          name="slug"
          label="Slug"
          tooltip="Auto-generated from name. Updates as you type."
          placeholder="auto-generated-slug"
          readOnly
        />

        <FormField
          control={form.control}
          name="description"
          tooltip="Brief description of this category."
          label="Description"
          placeholder="Optional description"
          as="textarea"
        />

        {/* Parent Category intentionally removed */}
        {/* <FormField
          control={form.control}
          name="parent_id"
          label="Parent Category"
          placeholder="Select parent category"
          tooltip="Optionally, select a parent category to create a hierarchy. Leave empty for top-level categories."
          as="select"
          options={allCategories.map((cat) => ({
            label: cat.name,
            value: cat.id,
          }))}
        /> */}
        {/* ── Active toggle ── */}
        <div
          className="flex items-center justify-between
                        px-3 sm:px-4 py-2.5 sm:py-3
                        rounded-xl border border-gray-200 dark:border-[#2a2d3a]
                        bg-gray-50 dark:bg-[#0f1117]"
        >
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Active Status
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Visible in store</p>
          </div>
          <button
            type="button"
            onClick={() => form.setValue("is_active", !isActiveValue)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full
                        transition-colors duration-300
                        focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:ring-offset-1
                        ${isActiveValue ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow
                          transition-transform duration-300
                          ${isActiveValue ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2
                     px-4 py-2.5 rounded-xl
                     bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700
                     disabled:opacity-60 disabled:cursor-not-allowed
                     text-white text-sm font-semibold
                     shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40
                     transition-all duration-200
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              {editingCategory ? "Updating…" : "Creating…"}
            </>
          ) : editingCategory ? (
            "Update Category"
          ) : (
            "Create Category"
          )}
        </button>
      </form>
    </div>
  );
}
