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

    const [priceMode, setPriceMode] = useState<"percentage" | "multiplier">(
      "percentage",
    );
    const [priceValue, setPriceValue] = useState<number | "">("");
    const [priceValueTouched, setPriceValueTouched] = useState(false);
    const [mrpTouched, setMrpTouched] = useState(false);

    const initialValues = React.useMemo<ProductType>(
      () => ({
        store_id: storeId,
        category_id: null,
        name: "",
        slug: "",
        description: "",
        short_description: "",
        base_price: undefined,
        tp_price: undefined,
        discounted_price: null,
        discount_amount: null,
        weight: null,
        sku: "",
        stock: undefined,
        featured: false,
        status: ProductStatus.ACTIVE,
        variants: [],
        images: [],
        dimensions: null,
        is_digital: false,
        meta_title: null,
        meta_description: null,
        ...product,
      }),
      [product, storeId],
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
    const hasActiveVariant = variants.some((v) => v.is_active);

    const tpPrice = form.watch("tp_price");
    const mrpPrice = form.watch("base_price");

    const { control, watch, setValue } = form;
    const discountAmount = watch("discount_amount");
    const discountedPrice = useDiscountCalculation({
      basePrice: mrpPrice ?? 0,
      discountAmount,
    });

    useEffect(() => {
      setValue("discounted_price", discountedPrice);
    }, [discountedPrice, setValue]);

    const displayCurrency = currencyLoading ? "" : (currency ?? "");

    // Two-way binding: Price Value ↔ MRP
    // Recalculate MRP when user edits Price Value or changes mode
    useEffect(() => {
      if (!tpPrice || priceValue === "" || !priceValueTouched) return;

      let calculatedMRP = 0;
      if (priceMode === "percentage") {
        calculatedMRP = Number(tpPrice) * (1 + Number(priceValue) / 100);
      } else {
        calculatedMRP = Number(tpPrice) * Number(priceValue);
      }

      setValue("base_price", Number(calculatedMRP.toFixed(2)), {
        shouldDirty: true,
        shouldValidate: true,
      });
      setPriceValueTouched(false);
    }, [tpPrice, priceValue, priceMode, priceValueTouched, setValue]);

    useEffect(() => {
      if (!tpPrice || !mrpPrice || !mrpTouched) return;

      if (priceMode === "percentage") {
        const percent =
          ((Number(mrpPrice) - Number(tpPrice)) / Number(tpPrice)) * 100;
        setPriceValue(Number(percent.toFixed(2)));
      } else {
        const multiplier = Number(mrpPrice) / Number(tpPrice);
        setPriceValue(Number(multiplier.toFixed(2)));
      }

      setMrpTouched(false);
    }, [mrpPrice, tpPrice, priceMode, mrpTouched]);

    // Variants status control
    useEffect(() => {
      if (variants.length === 0) {
        setShowInactiveWarning(false);
      } else {
        if (!hasActiveVariant) {
          form.setValue("status", ProductStatus.DRAFT);
          setShowInactiveWarning(true);
        } else {
          form.setValue("status", ProductStatus.ACTIVE);
          setShowInactiveWarning(false);
        }
      }
    }, [hasActiveVariant, variants.length, form]);

    // Fetch categories
    useEffect(() => {
      getCategoriesQuery(storeId).then(({ data }) => {
        if (data) setCategories(data);
      });
    }, [storeId]);

    // Handle name change & auto-generate slug
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

    return (
      <div>
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
            scrollToFirstError,
          )}
          className="space-y-10 max-w-6xl mx-auto p-2 lg:p-12 xl:p-16"
        >
          {/* Product Info */}
          <section className="shadow-md rounded-2xl p-6 lg:p-8 xl:p-10 space-y-6 max-w-full border">
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
                tooltip="Enter the official product name as it should appear in your catalog."
              />
              <FormField
                label="Slug"
                name="slug"
                control={control}
                readOnly
                tooltip="URL-friendly version of the product name. Auto-generated from the product name."
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
                tooltip="Select the most appropriate category for this product."
              />
              <FormField
                label="Short Description"
                name="short_description"
                type="text"
                control={control}
                className="w-full md:max-w-lg xl:max-w-xl h-12 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none transition"
                tooltip="Concise summary of the product (1–2 sentences)."
              />
            </div>
            <FormField
              label="Description"
              name="description"
              as="textarea"
              control={control}
              required
              className="w-full rounded-lg border border-muted-foreground px-3 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none transition h-32"
              tooltip="Detailed product description covering features, materials, usage, and benefits."
            />
          </section>

          {/* Pricing */}
          {variants.length === 0 && (
            <section className="shadow-md rounded-2xl p-6 lg:p-8 xl:p-10 space-y-6 border">
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
                  className="w-full md:max-w-lg xl:max-w-xl"
                  tooltip="Trade price for this product."
                />

                <div className="w-full md:max-w-lg xl:max-w-xl">
                  <label className="mb-1 block text-sm font-medium">
                    Price Markup{" "}
                    <span className="text-xs text-gray-500">
                      (Auto-calculates MRP)
                    </span>
                  </label>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <select
                      className="w-full md:w-fit rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                      value={priceMode}
                      onChange={(e) => {
                        setPriceMode(
                          e.target.value as "percentage" | "multiplier",
                        );
                        setPriceValueTouched(true); // mark touched to trigger recalculation
                      }}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="multiplier">Multiplier (×)</option>
                    </select>

                    <input
                      type="number"
                      className="w-full md:w-fit min-w-20 rounded-md border px-3 py-2 bg-white text-gray-700 border-gray-300 focus:ring-gray-500 focus:border-gray-500 dark:bg-black dark:text-gray-200 dark:border-gray-600 dark:focus:ring-gray-400 dark:focus:border-gray-400"
                      placeholder={priceMode === "percentage" ? "20" : "1.2"}
                      value={priceValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPriceValue(val === "" ? "" : Number(val));
                        setPriceValueTouched(true);
                      }}
                    />
                  </div>
                </div>

                <FormField
                  label={`MRP Price (${displayCurrency})`}
                  name="base_price"
                  type="number"
                  control={control}
                  required
                  onChange={() => setMrpTouched(true)}
                  className="w-full md:max-w-lg xl:max-w-xl"
                  tooltip="Maximum retail price (MRP)."
                />

                <FormField
                  label={`Discount Amount (${displayCurrency})`}
                  name="discount_amount"
                  type="number"
                  control={control}
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
                  className="w-full md:max-w-lg xl:max-w-xl"
                />

                <FormField
                  label="SKU"
                  name="sku"
                  control={control}
                  required
                  className="w-full md:max-w-lg xl:max-w-xl"
                />

                <FormField
                  label="Stock"
                  name="stock"
                  type="number"
                  control={control}
                  required
                  className="w-full md:max-w-lg xl:max-w-xl"
                />
              </div>
            </section>
          )}

          {/* Variants, Images, Featured, Status, Submit */}
          <ProductVariantsInline form={form} addIsActive={true} />
          <ProductImages
            images={images}
            setImages={(files) => form.setValue("images", files)}
            error={form.formState.errors.images?.message as string}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
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
  },
);

AddProductForm.displayName = "AddProductForm";
export default AddProductForm;
