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
import { useDiscountCalculation } from "@/lib/hook/useDiscountCalculation";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { ProductStatus } from "@/lib/types/enums";
import { Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

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
    const { currency, loading: currencyLoading } = useUserCurrencyIcon();

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
        status: ProductStatus.ACTIVE, // default active
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

    const {
      formState: { isSubmitting },
    } = form;

    const [categories, setCategories] = useState<
      { id: string; name: string; is_active: boolean }[]
    >([]);
    const [showInactiveWarning, setShowInactiveWarning] = useState(false);

    const images = form.watch("images") ?? [];
    const variants = form.watch("variants") ?? [];
    const [statusOpen, setStatusOpen] = useState(false);
    const hasActiveVariant = variants.some((v) => v.is_active);
    const toggleStatusOpen = () => setStatusOpen((prev) => !prev);

    // Control status based on variants
    useEffect(() => {
      if (variants.length === 0) {
        // No variants → allow free selection, reset warning
        setShowInactiveWarning(false);
      } else {
        // Has variants → enforce rule
        if (!hasActiveVariant) {
          // All variants inactive → set Draft
          form.setValue("status", ProductStatus.DRAFT);
          setShowInactiveWarning(true);
        } else {
          // At least one variant active → set Active
          form.setValue("status", ProductStatus.ACTIVE);
          setShowInactiveWarning(false);
        }
      }
    }, [hasActiveVariant, variants.length, form]);

    // Reset form when initial values change
    useEffect(() => {
      form.reset(initialValues);
    }, [form, initialValues]);

    // Fetch categories
    useEffect(() => {
      getCategoriesQuery(storeId).then(({ data }) => {
        if (data) setCategories(data);
      });
    }, [storeId]);

    // Handle name change and auto-generate slug
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

    // Expose form methods via ref
    useImperativeHandle(ref, () => ({
      reset: () => form.reset(initialValues),
      formValues: () => form.getValues(),
    }));

    // Scroll to first error
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

    // Handle discount calculation
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

    const displayCurrency = currencyLoading ? "" : currency ?? "";

    return (
      <div className="">
        {/* Persistent warning popup */}
        {showInactiveWarning && (
          <div className="fixed top-4 right-4 bg-red-50 border-l-4 border-red-400 text-red-900 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center justify-between max-w-sm w-full animate-slideInRight">
            <span className="text-sm font-medium">
              ⚠️ All variants are inactive. Product status is now{" "}
              <strong>Draft</strong>.
            </span>
            <button
              onClick={() => setShowInactiveWarning(false)}
              className="ml-4 text-red-900 font-bold hover:text-red-800 transition"
            >
              &times;
            </button>
          </div>
        )}

        <form
          onSubmit={form.handleSubmit(
            (data) =>
              onSubmit(data, {
                reset: () => form.reset(initialValues),
                formValues: () => form.getValues(),
              }),
            scrollToFirstError
          )}
          className="space-y-10 max-w-6xl mx-auto p-6 lg:p-12 xl:p-16"
        >
          {/* Product Info */}
          <section className=" shadow-md rounded-2xl p-6 lg:p-8 xl:p-10 space-y-6 max-w-full border">
            <h2 className="text-2xl lg:text-3xl font-semibold text-foreground border-b pb-2">
              Product Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-8">
              <FormField
                label="Product Name"
                name="name"
                control={control}
                required
                onChange={handleNameChange}
                className="w-full md:max-w-lg xl:max-w-xl"
                tooltip="Enter the official product name as it should appear in your catalog, e.g., Organic Cotton Baby Blanket"
              />
              <FormField
                label="Slug"
                name="slug"
                control={control}
                readOnly
                tooltip="URL-friendly version of the product name. Auto-generated from the product name. Only lowercase letters, numbers, and hyphens are allowed"
                className="w-full md:max-w-lg xl:max-w-xl"
              />
              <FormField
                label="Category"
                name="category_id"
                as="select"
                placeholder="Select a category"
                options={categories
                  .filter((c) => c.is_active)
                  .map((c) => ({ value: c.id, label: c.name }))}
                control={control}
                required
                className="w-full md:max-w-lg xl:max-w-xl"
                tooltip="Select the most appropriate category for this product to ensure accurate classification and searchability."
              />
              <FormField
                label="Short Description"
                name="short_description"
                type="text"
                tooltip="Provide a concise summary of the product highlighting key features or benefits (1–2 sentences)."
                control={control}
                className="w-full md:max-w-lg xl:max-w-xl h-12 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none transition"
              />
            </div>
            <FormField
              label="Description"
              name="description"
              as="textarea"
              control={control}
              required
              tooltip="Provide a detailed description covering product features, materials, usage, and benefits."
              className="w-full rounded-lg border border-muted-foreground px-3 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none transition h-32"
            />
          </section>

          {/* Pricing */}
          {variants.length === 0 && (
            <section className=" shadow-md rounded-2xl p-6 lg:p-8 xl:p-10 space-y-6">
              <h2 className="text-2xl lg:text-3xl font-semibold text-foreground border-b pb-2">
                Pricing
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-8">
                <FormField
                  label={`TP Price (${displayCurrency})`}
                  name="tp_price"
                  type="number"
                  control={control}
                  required
                  tooltip="Enter the trade price for this product in your store currency."
                  className="w-full md:max-w-lg xl:max-w-xl"
                />
                <FormField
                  label={`MRP Price (${displayCurrency})`}
                  name="base_price"
                  type="number"
                  control={control}
                  required
                  tooltip="Enter the maximum retail price (MRP). This is the original price before any discounts."
                  className="w-full md:max-w-lg xl:max-w-xl"
                />
                <FormField
                  label={`Discount Amount (${displayCurrency})`}
                  name="discount_amount"
                  type="number"
                  control={control}
                  tooltip="Optional: specify a discount amount to reduce the MRP and calculate the final selling price."
                  className="w-full md:max-w-lg xl:max-w-xl"
                />
                <FormField
                  label={`Discounted Price (${displayCurrency})`}
                  name="discounted_price"
                  type="number"
                  control={control}
                  readOnly
                  className="w-full md:max-w-lg xl:max-w-xl"
                />
                <FormField
                  label="Weight (kg)"
                  name="weight"
                  type="number"
                  control={control}
                  tooltip="Specify the product weight in kilograms (kg) for shipping and logistics purposes."
                  className="w-full md:max-w-lg xl:max-w-xl"
                />
                <FormField
                  label="SKU"
                  name="sku"
                  control={control}
                  required
                  tooltip="Enter a unique Stock Keeping Unit (SKU) for inventory tracking."
                  className="w-full md:max-w-lg xl:max-w-xl"
                />
                <FormField
                  label="Stock"
                  name="stock"
                  type="number"
                  tooltip="Specify the available quantity of the product in stock."
                  control={control}
                  required
                  className="w-full md:max-w-lg xl:max-w-xl"
                />
              </div>
            </section>
          )}

          {/* Variants */}
          <section className="border-muted-foreground shadow-md rounded-2xl p-6 lg:p-8 xl:p-10">
            <h2 className="text-2xl lg:text-3xl font-semibold text-foreground border-b pb-2 mb-4">
              Variants
            </h2>
            <ProductVariantsInline form={form} addIsActive={true} />
          </section>

          {/* Images */}
          <section className="border-priamry shadow-md rounded-2xl p-6 lg:p-8 xl:p-10 space-y-4">
            <h2 className="text-2xl lg:text-3xl font-semibold text-foreground border-b pb-2">
              Images
            </h2>
            <div className="grid w-full grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <ProductImages
                images={images}
                setImages={(files) => form.setValue("images", files)}
                error={form.formState.errors.images?.message as string}
              />
            </div>
          </section>

          {/* Featured & Status */}
          <section className=" shadow-md rounded-2xl p-6 lg:p-8 xl:p-10 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            {/* Featured */}
            <div className="flex items-center space-x-3">
              <input
                id="featured"
                type="checkbox"
                {...form.register("featured")}
                className="w-5 h-5 rounded border-primary accent-green-500"
              />
              <label
                htmlFor="featured"
                className="text-sm font-medium flex items-center gap-1"
              >
                Featured Product
                <Tooltip
                  title="Check this option to highlight the product on your store's homepage or promotional listings."
                  placement="top"
                >
                  <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer p-2" />
                </Tooltip>
              </label>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <label htmlFor="status" className="text-sm font-medium">
                Status:
              </label>
              <div className="relative">
                <select
                  id="status"
                  {...form.register("status")}
                  className="w-full bg-background border rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition appearance-none"
                  disabled={variants.length > 0 && !hasActiveVariant}
                  onClick={toggleStatusOpen} // toggle on click
                >
                  {Object.values(ProductStatus).map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>

                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg
                    className="w-4 h-4 text-muted-foreground transition-transform duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      transform: statusOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              {/* Show either regular tooltip or locked badge */}
              {!showInactiveWarning ? (
                <Tooltip
                  title="Set the current status of the product: Active (available), Draft (hidden), or Inactive (unavailable)."
                  placement="top"
                >
                  <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer p-2" />
                </Tooltip>
              ) : (
                <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                  <Tooltip
                    title="All variants are inactive, so status is locked as Draft until at least one variant becomes active."
                    placement="topRight"
                  >
                    <InfoCircleOutlined className="text-red-500" /> Locked
                  </Tooltip>
                </span>
              )}
            </div>
          </section>

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-linear-to-r from-green-500 to-green-600
             hover:from-green-600 hover:to-green-700
             text-white rounded-2xl px-10 py-3
             font-semibold shadow-lg transition
             flex items-center gap-2
             disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting && (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              )}

              {isSubmitting
                ? product
                  ? "Updating..."
                  : "Saving..."
                : product
                ? "Update Product"
                : "Save Product"}
            </Button>
          </div>
        </form>
      </div>
    );
  }
);

AddProductForm.displayName = "AddProductForm";
export default AddProductForm;
