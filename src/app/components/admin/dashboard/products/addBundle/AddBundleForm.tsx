"use client";

import React, { forwardRef, useImperativeHandle, useEffect, useState } from "react";
import { useForm, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bundleSchema, BundleType } from "@/lib/schema/bundleSchema";
import { useAddBundleDraftStore } from "@/lib/store/addBundleDraftStore";
import FormField from "@/app/components/admin/dashboard/products/addProducts/FormField";
import ProductImages from "@/app/components/admin/dashboard/products/addProducts/ProductImages";
import BundleComponentsInline from "./BundleComponentsInline";
import { Button } from "@/components/ui/button";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories";
import { useDiscountCalculation } from "@/lib/hook/useDiscountCalculation";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { ProductStatus } from "@/lib/types/enums";
import { Package, Tag, ImageIcon, Info } from "lucide-react";
import { Tooltip } from "antd";

interface AddBundleFormProps {
  bundle?: BundleType & { id?: string };
  storeId: string;
  onSubmit: (bundle: BundleType, formMethods: AddBundleFormRef) => void | Promise<void>;
}

export interface AddBundleFormRef {
  reset: () => void;
  formValues: () => BundleType;
}

const Section = ({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-border bg-card p-6 lg:p-8">
    <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
    {children}
  </section>
);

const FieldLabel = ({ label, required }: { label: string; required?: boolean }) => (
  <label className="mb-1.5 block text-sm font-medium text-foreground">
    {label}
    {required && <span className="ml-0.5 text-rose-500">*</span>}
  </label>
);

const AddBundleForm = forwardRef<AddBundleFormRef, AddBundleFormProps>(
  ({ bundle, storeId, onSubmit }, ref) => {
    const { currency, loading: currencyLoading } = useUserCurrencyIcon();
    const displayCurrency = currencyLoading ? "" : currency ?? "";
    const isAddMode = !bundle;

    // Subscribe to hydration flag — fires once after localStorage is read
    const hasHydrated = useAddBundleDraftStore((s) => s._hasHydrated);

    const initialValues = React.useMemo<BundleType>(
      () => ({
        store_id: storeId,
        category_id: null,
        name: "",
        slug: "",
        description: "",
        short_description: "",
        base_price: 0,
        discounted_price: null,
        discount_amount: null,
        sku: "",
        featured: false,
        status: ProductStatus.ACTIVE,
        images: [],
        bundle_items: [],
        ...bundle,
      }),
      [bundle, storeId]
    );

    const form = useForm<BundleType>({
      defaultValues: initialValues,
      resolver: zodResolver(bundleSchema),
    });

    const {
      control,
      watch,
      setValue,
      handleSubmit,
      formState: { isSubmitting, errors },
    } = form;

    const [categories, setCategories] = useState<
      { id: string; name: string; is_active: boolean }[]
    >([]);

    const images = watch("images") ?? [];
    const basePrice = watch("base_price");
    const discountAmount = watch("discount_amount");
    const discountedPrice = useDiscountCalculation({
      basePrice: basePrice ?? 0,
      discountAmount,
    });

    useEffect(() => {
      setValue("discounted_price", discountedPrice);
    }, [discountedPrice, setValue]);

    useEffect(() => {
      getCategoriesQuery(storeId).then(({ data }) => {
        if (data) setCategories(data);
      });
    }, [storeId]);

    // ── Draft persistence (add mode only) ───────────────────────────────────
    // Restore the draft once Zustand has finished reading from localStorage.
    // We must wait for _hasHydrated because getState() returns initial values
    // synchronously before the persist middleware has loaded from storage.
    useEffect(() => {
      if (!isAddMode || !hasHydrated) return;
      const draft = useAddBundleDraftStore.getState();
      if (draft.formValues) {
        form.reset({
          ...initialValues,
          ...draft.formValues,
          store_id: storeId, // always enforce current store
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasHydrated]);

    // Sync all form value changes → draft store (no re-renders)
    useEffect(() => {
      if (!isAddMode) return;
      const subscription = watch((values) => {
        useAddBundleDraftStore.getState().setFormValues(values as Partial<BundleType>);
      });
      return () => subscription.unsubscribe();
    }, [isAddMode, watch]);

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
      reset: () => {
        form.reset(initialValues);
        if (isAddMode) useAddBundleDraftStore.getState().clearDraft();
      },
      formValues: () => form.getValues(),
    }));

    const scrollToFirstError = (formErrors: FieldErrors) => {
      const firstErrorKey = Object.keys(formErrors)[0];
      if (!firstErrorKey) return;
      const element = document.getElementById(`field-${firstErrorKey}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const activeCategories = categories.filter((c) => c.is_active);

    return (
      <div className="bg-background">
        <form
          onSubmit={handleSubmit((data) => onSubmit(data, {
            reset: () => {
              form.reset(initialValues);
              if (isAddMode) useAddBundleDraftStore.getState().clearDraft();
            },
            formValues: () => form.getValues(),
          }), scrollToFirstError)}
          className="mx-auto max-w-7xl space-y-6 p-4 pb-16 lg:p-8 xl:p-10"
        >
          <div className="mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {bundle ? "Edit bundle" : "Create a bundle"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Combine existing products into one sellable combo, priced on its own.
            </p>
          </div>

          <Section icon={Package} title="Bundle information">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <FieldLabel label="Name" required />
                <FormField
                  name="name"
                  control={control}
                  required
                  placeholder="e.g. Starter Combo"
                  onChange={handleNameChange}
                />
              </div>
              <div>
                <FieldLabel label="Slug" />
                <FormField name="slug" control={control} readOnly placeholder="auto-generated-from-name" />
              </div>
              <div>
                <FieldLabel label="Category" required />
                <FormField
                  name="category_id"
                  as="select"
                  control={control}
                  required
                  placeholder={activeCategories.length ? "Choose a category" : "Add a category first"}
                  options={activeCategories.map((c) => ({ value: c.id, label: c.name }))}
                />
              </div>
              <div>
                <FieldLabel label="Short description" />
                <FormField
                  name="short_description"
                  control={control}
                  placeholder="One-line summary shown in listings…"
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel label="Description" required />
                <FormField
                  name="description"
                  as="textarea"
                  control={control}
                  required
                  placeholder="What's in this bundle and why it's a good deal…"
                  className="min-h-30 w-full"
                />
              </div>
            </div>
          </Section>

          <Section icon={Tag} title="Pricing" subtitle="Set independently of the component prices.">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <FieldLabel label={`Selling price (${displayCurrency})`} required />
                <FormField name="base_price" type="number" control={control} required placeholder="e.g. 999" />
              </div>
              <div>
                <FieldLabel label={`Discount amount (${displayCurrency})`} />
                <FormField name="discount_amount" type="number" control={control} placeholder="optional" />
              </div>
              <div>
                <FieldLabel label={`Final price (${displayCurrency})`} />
                <FormField name="discounted_price" type="number" control={control} readOnly placeholder="auto-calculated" />
              </div>
              <div>
                <FieldLabel label="SKU" required />
                <FormField name="sku" control={control} required placeholder="e.g. BUNDLE-001" />
              </div>
            </div>
          </Section>

          <BundleComponentsInline form={form} storeId={storeId} />

          <section className="rounded-2xl border border-border bg-card p-6 lg:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ImageIcon className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-semibold tracking-tight">Images</h2>
            </div>
            <ProductImages
              images={images}
              setImages={(files) => form.setValue("images", files)}
              error={errors.images?.message as string}
            />
          </section>

          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" {...form.register("featured")} className="sr-only peer" id="featured" />
                <div className="relative w-9 h-5 rounded-full bg-muted border border-border peer-checked:bg-amber-400 peer-checked:border-amber-400 transition-colors duration-200 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 peer-checked:after:translate-x-4" />
                <span className="text-sm font-medium flex items-center gap-1.5">
                  Featured
                  <Tooltip title="Show this bundle in featured sections" placement="top">
                    <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground hover:text-foreground transition-colors" />
                  </Tooltip>
                </span>
              </label>
              <div className="w-px h-5 bg-border hidden sm:block" />
              <div className="flex items-center gap-3">
                <label htmlFor="status" className="text-sm font-medium">Status</label>
                <select
                  id="status"
                  {...form.register("status")}
                  className="appearance-none rounded-lg border border-border bg-background py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-muted"
                >
                  {Object.values(ProductStatus).map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-35 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {isSubmitting
                ? bundle
                  ? "Updating…"
                  : "Saving…"
                : bundle
                  ? "Update bundle"
                  : "Save bundle"}
            </Button>
          </div>
        </form>
      </div>
    );
  }
);

AddBundleForm.displayName = "AddBundleForm";
export default AddBundleForm;
