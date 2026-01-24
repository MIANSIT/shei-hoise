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
import ConfirmModal from "@/app/components/admin/common/ConfirmModal"; // Add this import

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
    const [statusOpen, setStatusOpen] = useState(false);
    const toggleStatusOpen = () => setStatusOpen((prev) => !prev);

    // Add these state variables for pricing validation modal
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [pendingSubmit, setPendingSubmit] = useState<(() => void) | null>(
      null,
    );
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

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
      control,
      watch,
      setValue,
      handleSubmit,
      formState: { isSubmitting },
    } = form;

    const [categories, setCategories] = useState<
      { id: string; name: string; is_active: boolean }[]
    >([]);
    const [showInactiveWarning, setShowInactiveWarning] = useState(false);

    const images = watch("images") ?? [];
    const variants = watch("variants") ?? [];
    const hasActiveVariant = variants.some((v) => v.is_active);

    const tpPrice = watch("tp_price");
    const mrpPrice = watch("base_price");
    const discountAmount = watch("discount_amount");
    const discountedPrice = useDiscountCalculation({
      basePrice: mrpPrice ?? 0,
      discountAmount,
    });

    // Update discounted price whenever base_price or discount_amount changes
    useEffect(() => {
      setValue("discounted_price", discountedPrice);
    }, [discountedPrice, setValue]);

    const displayCurrency = currencyLoading ? "" : (currency ?? "");

    // TP → MRP calculation
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

    // MRP → PriceValue calculation
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

    // Variants → Status control
    useEffect(() => {
      if (variants.length === 0) {
        setShowInactiveWarning(false);
      } else if (!hasActiveVariant) {
        setValue("status", ProductStatus.DRAFT); // only force Draft if all inactive
        setShowInactiveWarning(true);
      } else {
        setShowInactiveWarning(false); // don't override ACTIVE
      }
    }, [hasActiveVariant, variants.length, setValue]);

    // Fetch categories
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
      if (!firstErrorKey) return;
      const element = document.getElementById(`field-${firstErrorKey}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("animate-shake");
        setTimeout(() => element.classList.remove("animate-shake"), 500);
      }
    };

    // Validation function to check TP > MRP
    const validatePricing = (data: ProductType): string[] => {
      const errors: string[] = [];

      // Check main product pricing
      if (data.tp_price && data.base_price) {
        const tp = Number(data.tp_price);
        const mrp = Number(data.base_price);
        if (tp > mrp) {
          errors.push(
            `Main Product: TP Price (${displayCurrency}${tp}) is greater than MRP (${displayCurrency} ${mrp})`,
          );
        }
      }

      // Check variant pricing
      if (data.variants && data.variants.length > 0) {
        data.variants.forEach((variant, index) => {
          if (variant.tp_price && variant.base_price) {
            const tp = Number(variant.tp_price);
            const mrp = Number(variant.base_price);
            if (tp > mrp) {
              const variantName =
                variant.variant_name || `Variant ${index + 1}`;
              errors.push(
                `${variantName}: TP Price (${displayCurrency} ${tp}) is greater than MRP (${displayCurrency}${mrp})`,
              );
            }
          }
        });
      }

      return errors;
    };

    // Modified form submission handler with pricing validation
    const handleFormSubmit = (data: ProductType) => {
      const pricingErrors = validatePricing(data);

      if (pricingErrors.length > 0) {
        setValidationErrors(pricingErrors);
        setPendingSubmit(
          () => () =>
            onSubmit(data, {
              reset: () => form.reset(initialValues),
              formValues: () => form.getValues(),
            }),
        );
        setShowWarningModal(true);
        return;
      }

      // No pricing issues, submit directly
      onSubmit(data, {
        reset: () => form.reset(initialValues),
        formValues: () => form.getValues(),
      });
    };

    const handleConfirmSubmit = () => {
      if (pendingSubmit) {
        pendingSubmit();
        setShowWarningModal(false);
        setPendingSubmit(null);
        setValidationErrors([]);
      }
    };

    const handleCancelSubmit = () => {
      setShowWarningModal(false);
      setPendingSubmit(null);
      setValidationErrors([]);
    };

    return (
      <div>
        {/* Pricing Warning Modal */}
        <ConfirmModal
          isOpen={showWarningModal}
          onClose={handleCancelSubmit}
          onConfirm={handleConfirmSubmit}
          title="Pricing Warning"
          message={
            <div className="space-y-3">
              <p className="font-medium">
                Are you sure you want to continue? The following pricing issues
                were detected:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm max-h-60 overflow-y-auto">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-gray-700 dark:text-gray-400">
                    {error}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                This means you might be selling products at a loss. Please
                review the pricing.
              </p>
            </div>
          }
          confirmText="Continue Anyway"
          cancelText="Review Pricing"
          type="warning"
        />

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
          onSubmit={handleSubmit(handleFormSubmit, scrollToFirstError)}
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
                placeholder="Premium Cotton T-Shirt"
                onChange={handleNameChange}
                className="w-full md:max-w-lg xl:max-w-xl"
                tooltip="Enter the official product name as it should appear in your catalog."
              />
              <FormField
                label="Slug"
                name="slug"
                placeholder="auto-generated-from-product-name"
                control={control}
                readOnly
                tooltip="URL-friendly version of the product name. Auto-generated from the product name."
                className="w-full md:max-w-lg xl:max-w-xl"
              />
              <FormField
                label="Category"
                name="category_id"
                as="select"
                placeholder="Choose a product category"
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
                placeholder="One-line summary shown in listings"
                control={control}
                className="w-full md:max-w-lg xl:max-w-xl h-12 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none transition"
                tooltip="Concise summary of the product (1–2 sentences)."
              />
            </div>
            <FormField
              label="Description"
              name="description"
              as="textarea"
              placeholder="Describe features, materials, usage, warranty, etc."
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
                  placeholder="Cost price (what you pay)"
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
                    <Tooltip
                      title={
                        "Controls how MRP is calculated from TP price. Choose Percentage to add a margin (%) or Multiplier to multiply the TP price directly."
                      }
                    >
                      <InfoCircleOutlined className="ml-1 text-gray-400 cursor-pointer" />
                    </Tooltip>
                  </label>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <select
                      className="w-full md:w-fit rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                      value={priceMode}
                      onChange={(e) => {
                        setPriceMode(
                          e.target.value as "percentage" | "multiplier",
                        );
                        setPriceValueTouched(true);
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
                  placeholder="Selling price before discount"
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
                  placeholder="Amount to reduce from MRP (Optional)"
                  control={control}
                  className="w-full md:max-w-lg xl:max-w-xl"
                  tooltip="Enter the discount amount to subtract from the MRP. This value is deducted directly."
                />

                <FormField
                  label={`Discounted Price (${displayCurrency})`}
                  name="discounted_price"
                  type="number"
                  control={control}
                  placeholder="Final price after discount (auto)"
                  readOnly
                  className="w-full md:max-w-lg xl:max-w-xl"
                  tooltip="Final selling price after applying the discount. This is auto-calculated."
                />

                <FormField
                  label="Weight (kg)"
                  name="weight"
                  placeholder="0.75kg"
                  type="number"
                  control={control}
                  className="w-full md:max-w-lg xl:max-w-xl"
                  tooltip="Product weight in kilograms. Used for shipping and logistics calculations."
                />

                <FormField
                  label="SKU"
                  name="sku"
                  placeholder="Unique product code (e.g. TS-RED-M)"
                  control={control}
                  required
                  className="w-full md:max-w-lg xl:max-w-xl"
                  tooltip="Unique Stock Keeping Unit used to identify this product in inventory."
                />

                <FormField
                  label="Stock"
                  name="stock"
                  type="number"
                  placeholder="Total available quantity"
                  control={control}
                  required
                  className="w-full md:max-w-lg xl:max-w-xl"
                  tooltip="Total available quantity for this product. Used to track inventory levels."
                />
              </div>
            </section>
          )}

          {/* Variants & Images */}
          <ProductVariantsInline form={form} addIsActive={true} />
          <ProductImages
            images={images}
            setImages={(files) => form.setValue("images", files)}
            error={form.formState.errors.images?.message as string}
          />

          {/* Featured + Status */}
          <section className="shadow-md rounded-2xl p-6 lg:p-8 xl:p-10 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
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
                  onClick={toggleStatusOpen}
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

          {/* Submit Button */}
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
