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
// import { InfoCircleOutlined } from "@ant-design/icons";
import ConfirmModal from "@/app/components/admin/common/ConfirmModal";
import {
  Package,
  Tag,
  ImageIcon,
  ChevronDown,
  AlertTriangle,
  Info,
} from "lucide-react";

interface AddProductFormProps {
  product?: ProductType;
  storeId: string;
  onSubmit: (product: ProductType, formMethods: AddProductFormRef) => void;
}

export interface AddProductFormRef {
  reset: () => void;
  formValues: () => ProductType;
}

// ─── Section Wrapper ────────────────────────────────────────────────────────
const Section = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="group relative rounded-2xl border border-border bg-card transition-shadow hover:shadow-md">
    {/* Accent line */}
    <div className="absolute left-0 top-0 h-full w-0.75 rounded-l-2xl bg-linear-to-b from-emerald-500 to-teal-400 opacity-0 transition-opacity group-hover:opacity-100" />
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      {children}
    </div>
  </section>
);

// ─── Field Label with Tooltip ────────────────────────────────────────────────
const FieldLabel = ({
  label,
  required,
  tooltip,
}: {
  label: string;
  required?: boolean;
  tooltip?: string;
}) => (
  <div className="mb-1.5 flex items-center gap-1.5">
    <label className="text-sm font-medium text-foreground">
      {label}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
    {tooltip && (
      <Tooltip title={tooltip} placement="top">
        <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground hover:text-foreground transition-colors" />
      </Tooltip>
    )}
  </div>
);

// ─── Price Badge ─────────────────────────────────────────────────────────────
const PriceCard = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {label}
    </p>
    {children}
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
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
    const displayCurrency = currencyLoading ? "" : (currency ?? "");

    useEffect(() => {
      setValue("discounted_price", discountedPrice);
    }, [discountedPrice, setValue]);

    useEffect(() => {
      if (!tpPrice || priceValue === "" || !priceValueTouched) return;
      const calculatedMRP =
        priceMode === "percentage"
          ? Number(tpPrice) * (1 + Number(priceValue) / 100)
          : Number(tpPrice) * Number(priceValue);
      setValue("base_price", Number(calculatedMRP.toFixed(2)), {
        shouldDirty: true,
        shouldValidate: true,
      });
      setPriceValueTouched(false);
    }, [tpPrice, priceValue, priceMode, priceValueTouched, setValue]);

    useEffect(() => {
      if (!tpPrice || !mrpPrice || !mrpTouched) return;
      if (priceMode === "percentage") {
        setPriceValue(
          Number(
            (
              ((Number(mrpPrice) - Number(tpPrice)) / Number(tpPrice)) *
              100
            ).toFixed(2),
          ),
        );
      } else {
        setPriceValue(Number((Number(mrpPrice) / Number(tpPrice)).toFixed(2)));
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
        const tp = Number(data.tp_price),
          mrp = Number(data.base_price);
        if (tp > mrp)
          errors.push(
            `Main Product: TP (${displayCurrency}${tp}) > MRP (${displayCurrency}${mrp})`,
          );
      }
      if (data.variants?.length) {
        data.variants.forEach((variant, index) => {
          if (variant.tp_price && variant.base_price) {
            const tp = Number(variant.tp_price),
              mrp = Number(variant.base_price);
            if (tp > mrp)
              errors.push(
                `${variant.variant_name || `Variant ${index + 1}`}: TP (${displayCurrency}${tp}) > MRP (${displayCurrency}${mrp})`,
              );
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

    const activeCategories = categories.filter((c) => c.is_active);
    const hasCategories = activeCategories.length > 0;

    return (
      <div className="min-h-screen bg-background">
        <ConfirmModal
          isOpen={showWarningModal}
          onClose={() => {
            setShowWarningModal(false);
            setPendingSubmit(null);
            setValidationErrors([]);
          }}
          onConfirm={handleConfirmSubmit}
          title="Pricing Warning"
          message={
            <div className="space-y-3">
              <p className="font-medium">
                Pricing issues detected — continue anyway?
              </p>
              <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
                {validationErrors.map((err, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-amber-800 dark:text-amber-300"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {err}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                You may be selling at a loss. Please review the pricing.
              </p>
            </div>
          }
          confirmText="Continue Anyway"
          cancelText="Review Pricing"
          type="warning"
        />

        {/* Inactive variant toast */}
        {showInactiveWarning && (
          <div className="fixed right-4 top-4 z-50 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-lg dark:border-rose-800/50 dark:bg-rose-950/80 max-w-sm animate-slideInRight">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
            <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
              All variants inactive — status set to{" "}
              <span className="font-bold">Draft</span>
            </p>
            <button
              onClick={() => setShowInactiveWarning(false)}
              className="ml-auto text-rose-400 hover:text-rose-600 transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit(handleFormSubmit, scrollToFirstError)}
          className="mx-auto max-w-7xl space-y-6 p-4 pb-16 lg:p-8 xl:p-10"
        >
          {/* Page header */}
          <div className="mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {product ? "Edit Product" : "New Product"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {product
                ? "Update the details below to modify your product."
                : "Fill in the details below to add a new product to your store."}
            </p>
          </div>

          {/* ── Product Information ── */}
          <Section icon={Package} title="Product Information">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <FieldLabel
                  label="Product Name"
                  required
                  tooltip="Enter the official product name. E.g. 'Premium Cotton T-Shirt'"
                />
                <FormField
                  name="name"
                  control={control}
                  required
                  placeholder="e.g. Premium Cotton T-Shirt"
                  onChange={handleNameChange}
                />
              </div>

              <div>
                <FieldLabel
                  label="URL Slug"
                  tooltip="Auto-generated from product name. Used in URLs."
                />
                <FormField
                  name="slug"
                  control={control}
                  readOnly
                  placeholder="auto-generated-from-name"
                />
              </div>

              <div>
                <FieldLabel
                  label="Category"
                  required
                  tooltip="Choose the category that best fits this product."
                />
                <FormField
                  name="category_id"
                  as="select"
                  control={control}
                  required
                  placeholder={
                    hasCategories
                      ? "Choose a category…"
                      : "No categories — create one first"
                  }
                  options={[
                    ...activeCategories.map((c) => ({
                      value: c.id,
                      label: c.name,
                    })),
                    { value: "create_new", label: "➕ Create New Category" },
                  ]}
                  onChange={(value) => {
                    if (value === "create_new")
                      window.location.href = "/dashboard/products/category";
                  }}
                />
                {!hasCategories && (
                  <p className="mt-1.5 text-xs text-rose-500">
                    No categories yet. Please create one to continue.
                  </p>
                )}
              </div>

              <div>
                <FieldLabel
                  label="Short Description"
                  tooltip="1–2 sentence summary shown in listings."
                />
                <FormField
                  name="short_description"
                  type="text"
                  control={control}
                  placeholder="One-line summary shown in product listings…"
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel
                  label="Description"
                  required
                  tooltip="Detailed description including features, materials, usage, warranty."
                />
                <FormField
                  name="description"
                  as="textarea"
                  control={control}
                  required
                  placeholder="Describe features, materials, usage instructions, warranty…"
                  className="min-h-30 w-full"
                />
              </div>
            </div>
          </Section>

          {/* ── Pricing ── */}
          {variants.length === 0 && (
            <Section icon={Tag} title="Pricing & Inventory">
              <div className="space-y-5">
                {/* TP + Markup row */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <PriceCard label="Trade Price (Cost)">
                    <FieldLabel
                      label={`TP Price (${displayCurrency})`}
                      required
                      tooltip="Wholesale / cost price you pay. Used to calculate profit margin."
                    />
                    <FormField
                      name="tp_price"
                      type="number"
                      control={control}
                      required
                      placeholder="e.g. 100"
                    />
                  </PriceCard>

                  <PriceCard label="Price Markup">
                    <FieldLabel
                      label="Markup Calculator"
                      tooltip="Applies markup to TP to auto-calculate MRP. Percentage: 20% on TP 100 → MRP 120. Multiplier: 1.2× on TP 100 → MRP 120."
                    />
                    <div className="flex gap-2">
                      <select
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-muted"
                        value={priceMode}
                        onChange={(e) => {
                          setPriceMode(
                            e.target.value as "percentage" | "multiplier",
                          );
                          setPriceValueTouched(true);
                        }}
                      >
                        <option value="percentage">% Percent</option>
                        <option value="multiplier">× Multiplier</option>
                      </select>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-muted"
                        placeholder={priceMode === "percentage" ? "20" : "1.2"}
                        value={priceValue}
                        onChange={(e) => {
                          setPriceValue(
                            e.target.value === "" ? "" : Number(e.target.value),
                          );
                          setPriceValueTouched(true);
                        }}
                      />
                    </div>
                  </PriceCard>
                </div>

                {/* MRP / Discount / Final Price row */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <PriceCard label="Selling Price">
                    <FieldLabel
                      label={`MRP (${displayCurrency})`}
                      required
                      tooltip="Regular selling price before discounts."
                    />
                    <FormField
                      name="base_price"
                      type="number"
                      control={control}
                      required
                      onChange={() => setMrpTouched(true)}
                      placeholder="e.g. 120"
                    />
                  </PriceCard>

                  <PriceCard label="Discount">
                    <FieldLabel
                      label={`Discount Amount (${displayCurrency})`}
                      tooltip="Amount subtracted from MRP. Leave blank for no discount."
                    />
                    <FormField
                      name="discount_amount"
                      type="number"
                      control={control}
                      placeholder="e.g. 10 (optional)"
                    />
                  </PriceCard>

                  <PriceCard label="Final Price">
                    <FieldLabel
                      label={`Discounted Price (${displayCurrency})`}
                      tooltip="Auto-calculated: MRP − Discount Amount."
                    />
                    <FormField
                      name="discounted_price"
                      type="number"
                      control={control}
                      placeholder="Auto-calculated"
                      readOnly
                    />
                  </PriceCard>
                </div>

                {/* Weight / SKU / Stock row */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div>
                    <FieldLabel
                      label="Weight (kg)"
                      tooltip="Used for shipping calculations. E.g. 0.5, 1.2"
                    />
                    <FormField
                      name="weight"
                      type="number"
                      control={control}
                      placeholder="e.g. 0.5"
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="SKU"
                      required
                      tooltip="Unique product identifier. E.g. TSHIRT-BLK-001"
                    />
                    <FormField
                      name="sku"
                      control={control}
                      required
                      placeholder="e.g. PROD-001"
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="Stock"
                      required
                      tooltip="Available inventory quantity."
                    />
                    <FormField
                      name="stock"
                      type="number"
                      control={control}
                      required
                      placeholder="e.g. 50"
                    />
                  </div>
                </div>
              </div>
            </Section>
          )}

          {/* ── Variants ── */}
          <ProductVariantsInline form={form} addIsActive={true} />

          {/* ── Images ── */}
          <section className="rounded-2xl border border-border bg-card p-6 lg:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ImageIcon className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Product Images
                </h2>
                <p className="text-xs text-muted-foreground">
                  Up to 5 images · Max 5MB each · First image is primary
                </p>
              </div>
            </div>
            <ProductImages
              images={images}
              setImages={(files) => form.setValue("images", files)}
              error={form.formState.errors.images?.message as string}
            />
          </section>

          {/* ── Status + Submit ── */}
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <div className="relative">
                <select
                  id="status"
                  {...form.register("status")}
                  disabled={variants.length > 0 && !hasActiveVariant}
                  onClick={() => setStatusOpen((p) => !p)}
                  className="appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-muted"
                >
                  {Object.values(ProductStatus).map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className={`pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform duration-200 ${statusOpen ? "rotate-180" : ""}`}
                />
              </div>

              {showInactiveWarning ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                  <AlertTriangle className="h-3 w-3" /> Locked as Draft
                </span>
              ) : (
                <Tooltip
                  title="Active = visible & purchasable. Draft = hidden work-in-progress. Inactive = hidden & not purchasable."
                  placement="top"
                >
                  <Info className="h-4 w-4 cursor-help text-muted-foreground hover:text-foreground transition-colors" />
                </Tooltip>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-35 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {isSubmitting
                ? product
                  ? "Updating…"
                  : "Saving…"
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
