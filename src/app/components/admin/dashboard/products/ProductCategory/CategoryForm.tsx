/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";
import { useZodForm } from "@/lib/utils/useZodForm";
import {
  createCategorySchema,
  type CreateCategoryType,
} from "@/lib/schema/category.schema";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import type { Category } from "@/lib/types/category";
import FormField from "@/app/components/admin/dashboard/products/addProducts/FormField";

interface AddCategoryCardFormProps {
  onSubmit?: (data: CreateCategoryType) => Promise<void> | void;
  editingCategory?: (CreateCategoryType & { id?: string }) | Category | null;
  onSuccess?: () => void;
  allCategories?: Category[];
}

export default function AddCategoryCardForm({
  onSubmit,
  editingCategory = null,
  onSuccess,
  allCategories = [],
}: AddCategoryCardFormProps) {
  const toast = useSheiNotification();

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

  useEffect(() => {
    if (editingCategory) {
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

  useEffect(() => {
    const slugValue = nameValue
      ? nameValue
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
      : "";

    form.setValue("slug", slugValue, { shouldValidate: true });
  }, [nameValue, form]);

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
        toast.info(
          "No submission handler provided. Form validated but didn't save."
        );
      }
      onSuccess?.();
      form.reset();
    } catch (error: any) {
      console.error("Error saving category (form):", error);
      toast.error(
        error?.message ?? "Failed to save category. Please try again."
      );
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {editingCategory ? "Edit Category" : "Add / Create Category"}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            label="Name"
            placeholder="Category name"
            required
            tooltip="Enter the official name of the category. This will appear in your store’s catalog and navigation."
          />

          <FormField
            control={form.control}
            name="slug"
            label="Slug"
            tooltip="Auto-generated URL-friendly identifier based on the category name. Only lowercase letters, numbers, and hyphens are allowed."
            placeholder="Auto Generated Slug"
            readOnly
          />

          <FormField
            control={form.control}
            name="description"
            tooltip="Provide a brief description of the category. This helps customers understand the products within this category."
            label="Description"
            placeholder="Optional description"
            as="textarea"
          />

          <FormField
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
          />

          <CardFooter className="px-0 pt-4">
            <Button
              type="submit"
              className="w-full"
              variant="destructive"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {editingCategory ? "Updating..." : "Creating..."}
                </span>
              ) : editingCategory ? (
                "Update Category"
              ) : (
                "Create Category"
              )}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
