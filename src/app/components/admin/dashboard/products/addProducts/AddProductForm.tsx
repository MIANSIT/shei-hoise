"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useState,
} from "react";
import { useZodForm } from "@/lib/utils/useZodForm";
import { productSchema, ProductType } from "@/lib/schema/productSchema";
import FormField from "./FormField";
import ProductImages from "./ProductImages";
import ProductVariantsInline from "./ProductVariants";
import { Button } from "@/components/ui/button";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { FieldErrors } from "react-hook-form";

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

    const initialValues: ProductType = product ?? {
      store_id: storeId,
      category_id: "",
      name: "",
      slug: "",
      description: "",
      short_description: "",
      base_price: 0,
      tp_price: 0,
      discounted_price: 0,
      discount_amount: 0,
      weight: 0,
      sku: "",
      stock: 0,
      variants: [],
      images: [],
    };

    const form = useZodForm<ProductType>(productSchema, initialValues);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>(
      []
    );

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
            (data) => {
              // ✅ Custom validation for main numeric fields
              if (data.base_price <= 0) {
                notifyError("Base Price must be greater than 0.");
                const el = document.getElementById("field-base_price");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  el.classList.add("animate-shake");
                  setTimeout(() => el.classList.remove("animate-shake"), 500);
                }
                return;
              }

              if (data.tp_price <= 0) {
                notifyError("TP Price must be greater than 0.");
                const el = document.getElementById("field-tp_price");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  el.classList.add("animate-shake");
                  setTimeout(() => el.classList.remove("animate-shake"), 500);
                }
                return;
              }

              if (variants.length === 0 && data.stock <= 0) {
                notifyError("Stock must be greater than 0 if there are no variants.");
                const el = document.getElementById("field-stock");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  el.classList.add("animate-shake");
                  setTimeout(() => el.classList.remove("animate-shake"), 500);
                }
                return;
              }

              // ✅ All good, submit
              onSubmit(data, {
                reset: () => form.reset(initialValues),
                formValues: () => form.getValues(),
              });
            },
            (errors) => {
              notifyError(
                "Please fix the highlighted required fields before saving."
              );
              scrollToFirstError(errors);
            }
          )}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <FormField
            label="Product Name"
            name="name"
            value={form.watch("name")}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            error={form.formState.errors.name?.message as string}
          />

          <FormField
            label="Slug"
            name="slug"
            value={form.watch("slug")}
            readOnly
            error={form.formState.errors.slug?.message as string}
          />

          <FormField
            label="Category"
            name="category_id"
            as="select"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={form.watch("category_id") ?? ""}
            onChange={(e) => form.setValue("category_id", e.target.value)}
            required
            error={form.formState.errors.category_id?.message as string}
          />

          <FormField
            label="Description"
            name="description"
            as="textarea"
            value={form.watch("description") ?? ""}
            onChange={(e) => form.setValue("description", e.target.value)}
            required
            error={form.formState.errors.description?.message as string}
          />

          <FormField
            label="Short Description"
            name="shortDescription"
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
              form.setValue(
                "base_price",
                Math.max(1, parseFloat(e.target.value))
              )
            }
            required
            error={form.formState.errors.base_price?.message as string}
          />

          <FormField
            label="TP Price"
            name="tp_price"
            type="number"
            min={1}
            value={form.watch("tp_price")}
            onChange={(e) =>
              form.setValue("tp_price", Math.max(1, parseFloat(e.target.value)))
            }
            required
            error={form.formState.errors.tp_price?.message as string}
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
          />

          <FormField
            label="SKU"
            name="sku"
            value={form.watch("sku")}
            onChange={(e) => form.setValue("sku", e.target.value)}
            required
            error={form.formState.errors.sku?.message as string}
          />

          {variants.length === 0 && (
            <FormField
              label="Stock"
              name="stock"
              type="number"
              min={1}
              value={form.watch("stock") ?? 1}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                form.setValue("stock", val > 0 ? val : 1);
              }}
              required
              error={form.formState.errors.stock?.message as string}
            />
          )}

          <ProductVariantsInline form={form} />

          <ProductImages
            images={images}
            setImages={(files) => form.setValue("images", files)}
          />

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
