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
import ConfirmModal from "@/app/components/admin/common/ConfirmModal";

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

    useEffect(() => {
      setValue("discounted_price", discountedPrice);
    }, [discountedPrice, setValue]);

    const displayCurrency = currencyLoading ? "" : (currency ?? "");

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

    useEffect(() => {
      if (variants.length === 0) {
        setShowInactiveWarning(false);
      } else if (!hasActiveVariant) {
        setValue("status", ProductStatus.DRAFT);
        setShowInactiveWarning(true);
      } else {
        setShowInactiveWarning(false);
      }
    }, [hasActiveVariant, variants.length, setValue]);

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

    const validatePricing = (data: ProductType): string[] => {
      const errors: string[] = [];

      if (data.tp_price && data.base_price) {
        const tp = Number(data.tp_price);
        const mrp = Number(data.base_price);
        if (tp > mrp) {
          errors.push(
            `Main Product: TP Price (${displayCurrency}${tp}) is greater than MRP (${displayCurrency} ${mrp})`,
          );
        }
      }

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

    const activeCategories = categories.filter((c) => c.is_active);
    const hasCategories = activeCategories.length > 0;

    return (
      <div>
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
                tooltip="Enter the official product name as it will appear in your store catalog. Example: 'Premium Cotton T-Shirt' or 'Wireless Bluetooth Headphones'."
              />
              <FormField
                label="Slug"
                name="slug"
                placeholder="auto-generated-from-product-name"
                control={control}
                readOnly
                tooltip="URL-friendly version of the product name, automatically generated. Example: 'premium-cotton-t-shirt'. This is used in product URLs."
                className="w-full md:max-w-lg xl:max-w-xl"
              />

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="block font-medium text-sm">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <Tooltip
                    title="Select the most appropriate category for this product. Categories help customers find products more easily. Example: 'Clothing', 'Electronics', 'Home & Garden'."
                    placement="top"
                  >
                    <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer" />
                  </Tooltip>
                </div>
                <FormField
                  name="category_id"
                  as="select"
                  placeholder={
                    hasCategories
                      ? "Choose a product category"
                      : "No categories available - Create one first"
                  }
                  options={
                    hasCategories
                      ? [
                          ...activeCategories.map((c) => ({
                            value: c.id,
                            label: c.name,
                          })),
                          {
                            value: "create_new",
                            label: "➕ Create New Category",
                          },
                        ]
                      : [
                          {
                            value: "create_new",
                            label: "➕ Create New Category",
                          },
                        ]
                  }
                  control={control}
                  required
                  onChange={(value) => {
                    if (value === "create_new") {
                      window.location.href = "/dashboard/products/category";
                    }
                  }}
                  className="w-full md:max-w-lg xl:max-w-xl"
                />
                {!hasCategories && (
                  <p className="text-xs text-red-500 mt-1">
                    No categories available. Please create a category first to
                    continue.
                  </p>
                )}
              </div>

              <FormField
                label="Short Description"
                name="short_description"
                type="text"
                placeholder="One-line summary shown in listings"
                control={control}
                className="w-full md:max-w-lg xl:max-w-xl h-12 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none transition"
                tooltip="Brief 1-2 sentence summary that appears in product listings and search results. Example: 'Soft, breathable cotton t-shirt perfect for everyday wear'."
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
              tooltip="Detailed product description covering features, materials, specifications, usage instructions, care instructions, and any warranty information. This appears on the product detail page."
            />
          </section>

          {/* Pricing section - rest of the code remains the same */}
          {variants.length === 0 && (
            <section className="shadow-md rounded-2xl p-6 lg:p-8 xl:p-10 space-y-6 border">
              <h2 className="text-2xl lg:text-3xl font-semibold text-foreground border-b pb-2">
                Pricing
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-8">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="block font-medium text-sm">
                      TP Price ({displayCurrency}){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Tooltip
                      title="Trade Price - the wholesale or cost price you pay for this product. This is your base cost and is used to calculate profit margins. Example: If you buy a t-shirt for 10Tk from supplier, enter 10."
                      placement="top"
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer" />
                    </Tooltip>
                  </div>
                  <FormField
                    name="tp_price"
                    type="number"
                    placeholder="e.g., 10, 25, 100"
                    control={control}
                    required
                    className="w-full md:max-w-lg xl:max-w-xl"
                  />
                </div>

                <div className="w-full md:max-w-lg xl:max-w-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="block text-sm font-medium">
                      Price Markup{" "}
                      <span className="text-xs text-gray-500">
                        (Auto-calculates MRP)
                      </span>
                    </label>
                    <Tooltip
                      title="Add a markup to TP Price to calculate MRP. Percentage example: 20% means if TP is 10, MRP = 10 × 1.20 = 12. Multiplier example: 1.5 means if TP is 10, MRP = 10 × 1.5 = 15."
                      placement="top"
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer" />
                    </Tooltip>
                  </div>
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

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="block font-medium text-sm">
                      MRP Price ({displayCurrency}){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Tooltip
                      title="Maximum Retail Price - the regular selling price before any discounts. This is calculated automatically from TP Price and markup, or can be entered manually. Example: If TP is 10Tk with 20% markup, MRP = 12Tk."
                      placement="top"
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer" />
                    </Tooltip>
                  </div>
                  <FormField
                    name="base_price"
                    type="number"
                    placeholder="e.g., 15, 30, 150"
                    control={control}
                    required
                    onChange={() => setMrpTouched(true)}
                    className="w-full md:max-w-lg xl:max-w-xl"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="block font-medium text-sm">
                      Discount Amount ({displayCurrency})
                    </label>
                    <Tooltip
                      title="Optional discount amount to subtract from MRP. Example: If MRP is 100Tk and you want to offer 20Tk off, enter 20. The final price will be 80Tk. Leave blank for no discount."
                      placement="top"
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer" />
                    </Tooltip>
                  </div>
                  <FormField
                    name="discount_amount"
                    type="number"
                    placeholder="e.g., 5, 10, 20 (optional)"
                    control={control}
                    className="w-full md:max-w-lg xl:max-w-xl"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="block font-medium text-sm">
                      Discounted Price ({displayCurrency})
                    </label>
                    <Tooltip
                      title="Final selling price after discount, automatically calculated as MRP minus Discount Amount. This is the price customers will pay. Example: MRP 100Tk - Discount 20Tk = Final Price 80Tk."
                      placement="top"
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer" />
                    </Tooltip>
                  </div>
                  <FormField
                    name="discounted_price"
                    type="number"
                    control={control}
                    placeholder="Auto-calculated"
                    readOnly
                    className="w-full md:max-w-lg xl:max-w-xl"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="block font-medium text-sm">
                      Weight (kg)
                    </label>
                    <Tooltip
                      title="Product weight in kilograms, used for shipping cost calculations and logistics. Example: 0.5 for 500 grams, 1.2 for 1.2 kg, 0.05 for 50 grams."
                      placement="top"
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer" />
                    </Tooltip>
                  </div>
                  <FormField
                    name="weight"
                    placeholder="e.g., 0.5, 1.2, 2.5"
                    type="number"
                    control={control}
                    className="w-full md:max-w-lg xl:max-w-xl"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="block font-medium text-sm">
                      SKU <span className="text-red-500">*</span>
                    </label>
                    <Tooltip
                      title="Stock Keeping Unit - a unique code to identify this product in your inventory system. Should be unique across all products. Example: 'TSHIRT-BLK-001', 'PHONE-128GB-WHT', 'BOOK-ISBN-12345'."
                      placement="top"
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer" />
                    </Tooltip>
                  </div>
                  <FormField
                    name="sku"
                    placeholder="e.g., TSHIRT-001, PROD-12345"
                    control={control}
                    required
                    className="w-full md:max-w-lg xl:max-w-xl"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="block font-medium text-sm">
                      Stock <span className="text-red-500">*</span>
                    </label>
                    <Tooltip
                      title="Total available inventory quantity. This number decreases when orders are placed and increases when you restock. Example: If you have 50 units available, enter 50. Set to 0 if out of stock."
                      placement="top"
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer" />
                    </Tooltip>
                  </div>
                  <FormField
                    name="stock"
                    type="number"
                    placeholder="e.g., 50, 100, 500"
                    control={control}
                    required
                    className="w-full md:max-w-lg xl:max-w-xl"
                  />
                </div>
              </div>
            </section>
          )}

          <ProductVariantsInline form={form} addIsActive={true} />

          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">Upload Images</h3>
              <Tooltip
                title="Upload high-quality product images. The first image will be the primary image shown in listings. You can upload multiple images to showcase different angles and details. Recommended size: at least 800x800 pixels."
                placement="top"
              >
                <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer" />
              </Tooltip>
            </div>

            <ProductImages
              images={images}
              setImages={(files) => form.setValue("images", files)}
              error={form.formState.errors.images?.message as string}
            />
          </div>

          <section className="shadow-md rounded-2xl p-6 lg:p-8 xl:p-10 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
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
                  title="Set product availability status: Active (visible and purchasable in store), Draft (hidden, work in progress), or Inactive (hidden and not purchasable). If all variants are inactive, status is automatically set to Draft."
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
