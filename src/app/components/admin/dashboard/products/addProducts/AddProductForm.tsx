"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useState,
} from "react";
import { useForm, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, ProductType } from "@/lib/schema/productSchema";
import FormField from "./FormField";
import ProductImages from "./ProductImages";
import ProductVariantsInline from "./ProductVariants";
import { Button } from "@/components/ui/button";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

interface AddProductFormProps {
  product?: ProductType;
  storeId: string;
  onSubmit: (product: ProductType, formMethods: AddProductFormRef) => void;
}

export interface AddProductFormRef {
  reset: () => void;
  formValues: () => ProductType;
}

const AddProductForm = forwardRef<AddProductFormRef, AddProductFormProps>(
  ({ product, storeId, onSubmit }, ref) => {
    const { error: notifyError } = useSheiNotification();

    // Make sure required numbers are always initialized
    const initialValues: ProductType = product ?? {
      store_id: storeId,
      category_id: "", // optional, can be empty string
      name: "",
      slug: "",
      description: "",
      short_description: "",
      base_price: 0, // required number
      tp_price: 0, // required number
      discounted_price: undefined,
      discount_amount: undefined,
      weight: undefined,
      sku: "",
      stock: 0, // required number
      featured: false, // required boolean
      status: "active", // required enum
      variants: [],
      images: [],
      dimensions: undefined,
      is_digital: false, // optional boolean, but we provide a value
      meta_title: undefined,
      meta_description: undefined,
    };

    const form = useForm<ProductType>({
      defaultValues: initialValues,
      resolver: zodResolver(productSchema),
    });

    const [categories, setCategories] = useState<
      { id: string; name: string }[]
    >([]);

    const images = form.watch("images") ?? [];
    const variants = form.watch("variants") ?? [];

    useEffect(() => {
      getCategoriesQuery(storeId).then(({ data }) => {
        if (data) setCategories(data);
      });
    }, [storeId]);

    const handleNameChange = (value: string) => {
      form.setValue("name", value);
      const slugValue = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      form.setValue("slug", slugValue);
    };

    useImperativeHandle(ref, () => ({
      reset: () => form.reset(initialValues),
      formValues: () => form.getValues(),
    }));

    const scrollToFirstError = (errors: FieldErrors) => {
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const element = document.getElementById(`field-${firstErrorKey}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("animate-shake");
          setTimeout(() => element.classList.remove("animate-shake"), 500);
        }
      }
    };

    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <form
          onSubmit={form.handleSubmit(
            (data) =>
              onSubmit(data, {
                reset: () => form.reset(initialValues),
                formValues: () => form.getValues(),
              }),
            (errors) => {
              notifyError(
                "Please fix the highlighted required fields before saving."
              );
              scrollToFirstError(errors);
            }
          )}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Basic Fields */}
          <FormField
            label="Product Name"
            name="name"
            value={form.watch("name")}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            error={form.formState.errors.name?.message?.toString()}
          />

          <FormField
            label="Slug"
            name="slug"
            value={form.watch("slug")}
            readOnly
            error={form.formState.errors.slug?.message?.toString()}
          />

          <FormField
            label="Category"
            name="category_id"
            as="select"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={form.watch("category_id") ?? ""}
            onChange={(e) => form.setValue("category_id", e.target.value)}
            error={form.formState.errors.category_id?.message?.toString()}
          />

          <FormField
            label="Description"
            name="description"
            as="textarea"
            value={form.watch("description") ?? ""}
            onChange={(e) => form.setValue("description", e.target.value)}
            required
            error={form.formState.errors.description?.message?.toString()}
          />

          <FormField
            label="Short Description"
            name="short_description"
            as="textarea"
            value={form.watch("short_description") ?? ""}
            onChange={(e) => form.setValue("short_description", e.target.value)}
          />

          <FormField
            label="Base Price"
            name="base_price"
            type="number"
            min={1}
            value={form.watch("base_price")}
            onChange={(e) =>
              form.setValue("base_price", parseFloat(e.target.value))
            }
            required
            error={form.formState.errors.base_price?.message?.toString()}
          />

          <FormField
            label="TP Price"
            name="tp_price"
            type="number"
            min={1}
            value={form.watch("tp_price")}
            onChange={(e) =>
              form.setValue("tp_price", parseFloat(e.target.value))
            }
            required
            error={form.formState.errors.tp_price?.message?.toString()}
          />

          <FormField
            label="Discounted Price"
            name="discounted_price"
            type="number"
            value={form.watch("discounted_price") ?? ""}
            onChange={(e) =>
              form.setValue(
                "discounted_price",
                e.target.value ? parseFloat(e.target.value) : undefined
              )
            }
            error={form.formState.errors.discounted_price?.message?.toString()}
          />

          <FormField
            label="Discount Amount"
            name="discount_amount"
            type="number"
            value={form.watch("discount_amount") ?? ""}
            onChange={(e) =>
              form.setValue(
                "discount_amount",
                e.target.value ? parseFloat(e.target.value) : undefined
              )
            }
            error={form.formState.errors.discount_amount?.message?.toString()}
          />

          <FormField
            label="Weight"
            name="weight"
            type="number"
            value={form.watch("weight") ?? ""}
            onChange={(e) =>
              form.setValue(
                "weight",
                e.target.value ? parseFloat(e.target.value) : undefined
              )
            }
            error={form.formState.errors.weight?.message?.toString()}
          />

          <FormField
            label="SKU"
            name="sku"
            value={form.watch("sku")}
            onChange={(e) => form.setValue("sku", e.target.value)}
            required
            error={form.formState.errors.sku?.message?.toString()}
          />

          {variants.length === 0 && (
            <FormField
              label="Stock"
              name="stock"
              type="number"
              min={0}
              value={form.watch("stock")}
              onChange={(e) =>
                form.setValue("stock", parseInt(e.target.value) || 0)
              }
              required
              error={form.formState.errors.stock?.message?.toString()}
            />
          )}

          {/* Product Variants & Images */}
          <ProductVariantsInline form={form} />
          <ProductImages
            images={images}
            setImages={(files) => form.setValue("images", files)}
          />

          {/* Featured & Status */}
          <div className="flex items-center justify-between mt-2 col-span-1 md:col-span-2 space-x-4">
            <div className="flex items-center space-x-2">
              <input
                id="featured"
                type="checkbox"
                checked={form.watch("featured") ?? false}
                onChange={(e) => form.setValue("featured", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="featured" className="text-sm font-bold pl-1">
                Featured Product
              </label>
            </div>

            <div className="flex flex-col w-1/2">
              <label htmlFor="status" className="text-sm font-medium mb-1">
                Status
              </label>
              <select
                id="status"
                value={form.watch("status") ?? "draft"}
                onChange={(e) =>
                  form.setValue(
                    "status",
                    e.target.value as
                      | "draft"
                      | "active"
                      | "inactive"
                      | "archived"
                  )
                }
                className="border rounded-md px-3 py-2 w-full"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="col-span-1 md:col-span-2 flex justify-end mt-4">
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              {product ? "Update Product" : "Save Product"}
            </Button>
          </div>
        </form>
      </div>
    );
  }
);

AddProductForm.displayName = "AddProductForm";
export default AddProductForm;
