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
import ProductVariantsInline from "./ProductVariantsInline";
import { Button } from "@/components/ui/button";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useDiscountCalculation } from "@/lib/hook/useDiscountCalculation";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { ProductStatus } from "@/lib/types/enums";
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
    const {
      currency,
      // icon: currencyIcon,
      loading: currencyLoading,
    } = useUserCurrencyIcon();
    const initialValues = React.useMemo<ProductType>(
      () => ({
        store_id: storeId,
        category_id: null,
        name: "",
        slug: "",
        description: "",
        short_description: "",
        base_price: 0,
        tp_price: 0,
        discounted_price: null,
        discount_amount: null,
        weight: null,
        sku: "",
        stock: 0,
        featured: false,
        status: "active",
        variants: [],
        images: [],
        dimensions: null,
        is_digital: false,
        meta_title: null,
        meta_description: null,
        ...product,
      }),
      [product, storeId]
    );

    const form = useForm<ProductType>({
      defaultValues: initialValues,
      resolver: zodResolver(productSchema),
    });

    const [categories, setCategories] = useState<
      { id: string; name: string; is_active: boolean }[]
    >([]);
    const images = form.watch("images") ?? [];
    const variants = form.watch("variants") ?? [];

    useEffect(() => {
      form.reset(initialValues);
    }, [form, initialValues]);

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

    // const displayCurrencyIcon = currencyLoading ? null : currencyIcon ?? null;
    const displayCurrency = currencyLoading ? "" : currency ?? "";
    return (
      <div className="">
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
          <section className="p-6 rounded-xl shadow-inner space-y-4">
            <h2 className="text-xl font-semibold ">Product Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Product Name"
                name="name"
                control={control}
                required
                onChange={handleNameChange}
              />
              <FormField label="Slug" name="slug" control={control} readOnly />
              <FormField
                label="Category"
                name="category_id"
                as="select"
                placeholder="Select a category"
                options={categories
                  .filter((c) => c.is_active)
                  .map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                control={control}
                required
              />
              <FormField
                label="Short Description"
                name="short_description"
                type="text"
                control={control}
                className="h-12 rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <FormField
              label="Description"
              name="description"
              as="textarea"
              control={control}
              required
              className="h-24 rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </section>

          {variants.length === 0 && (
            <section className="p-6 rounded-xl shadow-inner space-y-4">
              <h2 className="text-xl font-semibold ">Pricing</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label={`TP Price (${displayCurrency})`}
                  name="tp_price"
                  type="number"
                  control={control}
                  required
                />
                <FormField
                  label={`MRP Price (${displayCurrency})`}
                  name="base_price"
                  type="number"
                  control={control}
                  required
                />
                <FormField
                  label={`Discount Amount (${displayCurrency})`}
                  name="discount_amount"
                  type="number"
                  control={control}
                />
                <FormField
                  label={`Discounted Price (${displayCurrency})`}
                  name="discounted_price"
                  type="number"
                  control={control}
                  readOnly
                />
                <FormField
                  label="Weight (kg)"
                  name="weight"
                  type="number"
                  control={control}
                />
                <FormField label="SKU" name="sku" control={control} required />

                <FormField
                  label="Stock"
                  name="stock"
                  type="number"
                  control={control}
                  required
                />
              </div>
            </section>
          )}
          <section className=" rounded-xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProductVariantsInline form={form} addIsActive={true} />
            </div>
          </section>

          <section className="p-6 rounded-xl shadow-inner space-y-4">
            <h2 className="text-xl font-semibold">Images</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProductImages
                images={images}
                setImages={(files) => form.setValue("images", files)}
                error={form.formState.errors.images?.message as string}
              />
            </div>
          </section>

          <section className="p-6 rounded-xl shadow-inner flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="flex items-center space-x-3">
              <input
                id="featured"
                type="checkbox"
                {...form.register("featured")}
                className="w-5 h-5 rounded border-gray-300 accent-green-500"
              />
              <label htmlFor="featured" className="text-sm font-semibold ml-1">
                Featured Product
              </label>
            </div>

            <div className="flex flex-col w-full md:w-1/3">
              <label htmlFor="status" className="text-sm font-medium mb-1">
                Status
              </label>
              <select
                id="status"
                {...form.register("status")}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition"
              >
                {Object.values(ProductStatus).map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl px-6 py-3 font-semibold shadow-md transition"
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
