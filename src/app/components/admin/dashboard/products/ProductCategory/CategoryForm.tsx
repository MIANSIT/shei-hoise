// File: components/admin/products/AddCategoryCardForm.tsx
"use client";

import * as React from "react";
import { message } from "antd";
import { useZodForm } from "@/lib/utils/useZodForm";
import {
  categorySchema,
  type CategoryFormValues,
} from "@/lib/utils/formSchema";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AddCategoryCardFormProps {
  onSubmit?: (data: CategoryFormValues) => void;
  editingCategory?: CategoryFormValues | null; // optional for edit mode
}

export default function AddCategoryCardForm({
  onSubmit,
  editingCategory = null,
}: AddCategoryCardFormProps) {
  const form = useZodForm<CategoryFormValues>(categorySchema, {
    name: "",
    description: "",
  });

  // Whenever editingCategory changes, populate the form
  React.useEffect(() => {
    if (editingCategory) {
      form.reset(editingCategory);
    } else {
      form.reset({ name: "", description: "" });
    }
  }, [editingCategory, form]);
  const handleSubmit = (data: CategoryFormValues) => {
    if (onSubmit) onSubmit(data); // Call parent
    form.reset(); // Reset after submission
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {editingCategory ? "Edit Category" : "Add / Create Category"}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Name Field */}
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...form.register("name")} placeholder="Category name" />
              </FormControl>
              <FormMessage>{form.formState.errors.name?.message}</FormMessage>
            </FormItem>

            {/* Description Field */}
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input
                  {...form.register("description")}
                  placeholder="Optional description"
                />
              </FormControl>
              <FormMessage>
                {form.formState.errors.description?.message}
              </FormMessage>
            </FormItem>

            {/* Submit Button */}
            <CardFooter>
              <Button variant="destructive" type="submit" className="w-full">
                {editingCategory ? "Update Category" : "Create Category"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
