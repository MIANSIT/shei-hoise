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
import { useDiscountCalculation } from "@/lib/hook/useDiscountCalculation";

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
      category_id: undefined,
      name: "",
      slug: "",
      description: "",
      short_description: "",
      base_price: 0,
      tp_price: 0,
      discounted_price: undefined,
      discount_amount: undefined,
      weight: undefined,
      sku: "",
      stock: 0,
      featured: false,
      status: "active",
      variants: [],
      images: [],
      dimensions: undefined,
      is_digital: false,
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

    const handleNameChange = (value: unknown) => {
      if (typeof value !== "string") return;
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

    const { control, watch, setValue } = form;

    const basePrice = watch("base_price");
    const discountAmount = watch("discount_amount");
    const discountedPrice = useDiscountCalculation({
      basePrice: basePrice ?? 0,
      discountAmount,
    });

    useEffect(() => {
      setValue("discounted_price", discountedPrice);
    }, [discountedPrice, setValue]);

    return (
      <div className="max-w-5xl mx-auto p-6 space-y-8 rounded-2xl shadow-lg">
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
          className="space-y-8"
        >
          {/* ----------------- Product Info ----------------- */}
          <section className="p-6 rounded-xl shadow-inner space-y-4">
            <h2 className="text-xl font-semibold ">Product Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Product Name"
                name="name"
                control={control}
                required
                onChange={handleNameChange}
                error={form.formState.errors.name?.message?.toString()}
              />
              <FormField
                label="Slug"
                name="slug"
                control={control}
                readOnly
                error={form.formState.errors.slug?.message?.toString()}
              />
              <FormField
                label="Category"
                name="category_id"
                as="select"
                placeholder="Select a category"
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                control={control}
                required
                error={form.formState.errors.category_id?.message?.toString()}
              />
              <FormField
                label="Short Description"
                name="short_description"
                type="text"
                control={control}
                className="h-12 rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                error={form.formState.errors.short_description?.message?.toString()}
              />
            </div>
            <FormField
              label="Description"
              name="description"
              as="textarea"
              control={control}
              required
              className="h-24 rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              error={form.formState.errors.description?.message?.toString()}
            />
          </section>

          {/* ----------------- Pricing Info ----------------- */}
          <section className="p-6 rounded-xl shadow-inner space-y-4">
            <h2 className="text-xl font-semibold ">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="TP Price (BDT)"
                name="tp_price"
                type="number"
                control={control}
                required
                error={form.formState.errors.tp_price?.message?.toString()}
              />
              <FormField
                label="MRP Price (BDT)"
                name="base_price"
                type="number"
                control={control}
                required
                error={form.formState.errors.base_price?.message?.toString()}
              />
              <FormField
                label="Discount Amount (BDT)"
                name="discount_amount"
                type="number"
                control={control}
                error={form.formState.errors.discount_amount?.message?.toString()}
              />
              <FormField
                label="Discounted Price (BDT)"
                name="discounted_price"
                type="number"
                control={control}
                readOnly
                error={form.formState.errors.discounted_price?.message?.toString()}
              />
              <FormField
                label="Weight (kg)"
                name="weight"
                type="number"
                control={control}
                error={form.formState.errors.weight?.message?.toString()}
              />
              <FormField
                label="SKU"
                name="sku"
                control={control}
                required
                error={form.formState.errors.sku?.message?.toString()}
              />
              {variants.length === 0 && (
                <FormField
                  label="Stock"
                  name="stock"
                  type="number"
                  control={control}
                  required
                  error={form.formState.errors.stock?.message?.toString()}
                />
              )}
            </div>
          </section>

          {/* ----------------- Variants ----------------- */}
          <section className="p-6 rounded-xl shadow-inner space-y-4">
            <h2 className="text-xl font-semibold">Variants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProductVariantsInline form={form} />
            </div>
          </section>

          {/* ----------------- Images ----------------- */}
          <section className="p-6 rounded-xl shadow-inner space-y-4">
            <h2 className="text-xl font-semibold">Images</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProductImages
                images={images}
                setImages={(files) => form.setValue("images", files)}
              />
            </div>
          </section>

          {/* ----------------- Featured & Status ----------------- */}
          <section className="p-6 rounded-xl shadow-inner flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="flex items-center space-x-3">
              <input
                id="featured"
                type="checkbox"
                {...form.register("featured")} // ✅ bind using react-hook-form
                className="w-5 h-5 rounded border-gray-300 accent-green-500"
              />
              <label htmlFor="featured" className="text-sm font-semibold ml-1">
                Featured Product
              </label>
            </div>

            <div className="flex flex-col w-full md:w-1/3">
              <label htmlFor="status" className="text-sm font-medium mb-1 ">
                Status
              </label>
              <select
                id="status"
                {...form.register("status")} // ✅ bind using react-hook-form
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </section>

          {/* ----------------- Submit Button ----------------- */}
          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl px-6 py-3 font-semibold shadow-md transition"
            >
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
