/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { useZodForm } from "@/lib/utils/useZodForm";
import {
  createCategorySchema,
  type CreateCategoryType,
} from "@/lib/schema/category.schema";
import { Form, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import type { Category } from "@/lib/types/category";

interface AddCategoryCardFormProps {
  /** parent handles DB work (create/update) */
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

  // Sync slug with name
  React.useEffect(() => {
    const sub = form.watch((values, { name }) => {
      if (name === "name") {
        const slugValue = values.name
          ? values.name
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9\s-]/g, "")
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-")
          : "";
        form.setValue("slug", slugValue);
      }
    });
    return () => sub.unsubscribe();
  }, [form]);

  // Populate fields when editing (defensive mapping)
  React.useEffect(() => {
    if (editingCategory) {
      const mapped = {
        name: (editingCategory as any).name ?? "",
        slug: (editingCategory as any).slug ?? "",
        description: (editingCategory as any).description ?? "",
        parent_id: (editingCategory as any).parent_id ?? (editingCategory as any).parentId ?? null,
        is_active: (editingCategory as any).is_active ?? true,
      } as CreateCategoryType;
      form.reset(mapped);
    } else {
      form.reset({ name: "", slug: "", description: "", parent_id: null as any, is_active: true });
    }
  }, [editingCategory, form]);

  const handleSubmit = async (data: CreateCategoryType) => {
    // normalize parent_id ("" -> null)
    const normalized: CreateCategoryType = {
      ...data,
      parent_id:
        data.parent_id === "" || data.parent_id === undefined ? null : (data.parent_id as any),
    };

    try {
      // Delegate DB action to parent (CategoryPage)
      if (onSubmit) {
        await onSubmit(normalized); // await parent DB op (may be async)
      } else {
        // If parent didn't provide onSubmit, show a helpful message
        toast.info("No submission handler provided. Form validated but didn't save.");
      }

      onSuccess?.();
      form.reset();
    } catch (error: any) {
      console.error("Error saving category (form):", error);
      toast.error(error?.message ?? "Failed to save category. Please try again.");
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{editingCategory ? "Edit Category" : "Add / Create Category"}</CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...form.register("name")} placeholder="Category name" />
              </FormControl>
              <FormMessage>{form.formState.errors.name?.message}</FormMessage>
            </FormItem>

            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input {...form.register("slug")} placeholder="Auto Generated Slug" readOnly />
              </FormControl>
              <FormMessage>{form.formState.errors.slug?.message}</FormMessage>
            </FormItem>

            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...form.register("description")} placeholder="Optional description" />
              </FormControl>
              <FormMessage>{form.formState.errors.description?.message}</FormMessage>
            </FormItem>

            <FormItem>
              <FormLabel>Parent Category</FormLabel>
              <FormControl>
                <select {...form.register("parent_id")} className="border rounded w-full p-2">
                  <option value="">None</option>
                  {allCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage>{form.formState.errors.parent_id?.message}</FormMessage>
            </FormItem>

            <CardFooter className="px-0 pt-4">
              <Button type="submit" className="w-full" variant="destructive">
                {editingCategory ? "Update Category" : "Create Category"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
