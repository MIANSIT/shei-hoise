"use client";

import { useState, useEffect, useRef } from "react";
import { useAdminShipping } from "@/lib/hook/deliveryCost/useAdminShipping";
import { ShippingOption } from "@/lib/queries/deliveryCost/getShippingFees";
import { ShippingHeaderActions } from "@/app/components/shipping/ShippingHeaderActions";
import { ShippingOptionsList } from "@/app/components/shipping/ShippingOptionsList";
import { ShippingLoadingState } from "@/app/components/shipping/ShippingLoadingState";
import { ShippingErrorState } from "@/app/components/shipping/ShippingErrorState";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { Package, Tag, Eye, Banknote } from "lucide-react";

interface ShippingManagerProps {
  storeSlug: string;
}

export function ShippingManager({ storeSlug }: ShippingManagerProps) {
  const {
    shippingConfig,
    loading,
    error,
    updateFees,
    refetch,
    clearError,
    isUpdating,
  } = useAdminShipping(storeSlug);

  const { warning, info } = useSheiNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [hasValidated, setHasValidated] = useState(false);
  const initialFetchRef = useRef(false);

  useEffect(() => {
    if (storeSlug && !initialFetchRef.current && !loading) {
      initialFetchRef.current = true;
      refetch();
    }
  }, [storeSlug, loading, refetch]);

  useEffect(() => {
    if (shippingConfig) setShippingOptions(shippingConfig.shipping_options);
  }, [shippingConfig]);

  useEffect(() => {
    if (isEditing) {
      clearError();
      info("Editing mode active. Make your changes and save when ready.");
      setHasValidated(false);
    }
  }, [isEditing, clearError, info]);

  const hasChanges = () => {
    if (!shippingConfig) return false;
    return (
      JSON.stringify(shippingConfig.shipping_options) !==
      JSON.stringify(shippingOptions)
    );
  };

  const isValidForm = (showWarning = true) => {
    if (shippingOptions.length === 0) {
      if (showWarning)
        warning("Add at least one shipping option before saving.");
      return false;
    }
    const valid = shippingOptions.every(
      (o) => o.name.trim() !== "" && o.price >= 0,
    );
    if (!valid && showWarning)
      warning("Please fill all required fields for all options.");
    return valid;
  };

  const canSave = () =>
    hasValidated ? hasChanges() && isValidForm(false) : hasChanges();

  const addShippingOption = () => {
    setShippingOptions([
      ...shippingOptions,
      { name: "", price: 0, customer_view: true },
    ]);
    info("New shipping option added.");
  };

  const updateShippingOption = (
    index: number,
    field: keyof ShippingOption,
    value: string | number | boolean | undefined,
  ) => {
    const updated = [...shippingOptions];
    updated[index] = { ...updated[index], [field]: value };
    setShippingOptions(updated);
  };

  const removeShippingOption = (index: number) => {
    const name = shippingOptions[index].name || `Option ${index + 1}`;
    setShippingOptions(shippingOptions.filter((_, i) => i !== index));
    info(`"${name}" removed.`);
  };

  const handleSave = async () => {
    setHasValidated(true);
    if (!hasChanges()) {
      warning("No changes to save.");
      return;
    }
    if (!isValidForm(true)) return;
    const valid = shippingOptions.filter(
      (o) => o.name.trim() !== "" && o.price >= 0,
    );
    const success = await updateFees({ shipping_options: valid });
    if (success) {
      setIsEditing(false);
      setHasValidated(false);
    }
  };

  const handleCancel = () => {
    if (shippingConfig) setShippingOptions(shippingConfig.shipping_options);
    setIsEditing(false);
    clearError();
    setHasValidated(false);
    info("Changes discarded.");
  };

  const visibleCount = shippingOptions.filter(
    (o) => o.customer_view !== false,
  ).length;
  const hiddenCount = shippingOptions.length - visibleCount;
  const freeCount = shippingOptions.filter((o) => o.price === 0).length;

  if (loading) return <ShippingLoadingState />;
  if (error) return <ShippingErrorState error={error} onRetry={refetch} />;

  const stats = [
    {
      label: "Total Methods",
      value: shippingOptions.length,
      icon: Package,
      iconBg: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-500 dark:text-blue-400",
      sub: null,
    },
    {
      label: "Free Shipping",
      value: freeCount,
      icon: Tag,
      iconBg: "bg-emerald-50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-500 dark:text-emerald-400",
      sub: null,
    },
    {
      label: "At Checkout",
      value: visibleCount,
      icon: Eye,
      iconBg: "bg-violet-50 dark:bg-violet-900/20",
      iconColor: "text-violet-500 dark:text-violet-400",
      sub: hiddenCount > 0 ? `${hiddenCount} hidden` : null,
    },
    {
      label: "Currency",
      value: shippingConfig?.currency || "BDT",
      icon: Banknote,
      iconBg: "bg-amber-50 dark:bg-amber-900/20",
      iconColor: "text-amber-500 dark:text-amber-400",
      sub: null,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(({ label, value, icon: Icon, iconBg, iconColor, sub }) => (
          <div
            key={label}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-3.5 sm:p-5 flex items-center gap-2.5 sm:gap-4 min-w-0"
          >
            {/* Icon — hidden on mobile, shown sm+ */}
            <div
              className={`hidden sm:flex w-10 h-10 sm:w-11 sm:h-11 ${iconBg} rounded-xl items-center justify-center shrink-0`}
            >
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              {/* Mobile: small icon + label inline */}
              <div className="flex sm:hidden items-center gap-1.5 mb-1.5">
                <div
                  className={`w-5 h-5 ${iconBg} rounded-md flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-3 h-3 ${iconColor}`} />
                </div>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide truncate leading-none">
                  {label}
                </p>
              </div>
              {/* sm+: label only */}
              <p className="hidden sm:block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide leading-none mb-1.5 truncate">
                {label}
              </p>
              <div className="flex items-baseline gap-1 flex-wrap">
                <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 leading-none tabular-nums">
                  {value}
                </p>
                {sub && (
                  <span className="text-[10px] sm:text-xs font-semibold text-orange-400 dark:text-orange-300 leading-none">
                    {sub}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Delivery Methods
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 hidden sm:block">
              Configure options visible to customers at checkout
            </p>
          </div>
          {/* Desktop actions */}
          <div className="hidden sm:block shrink-0">
            <ShippingHeaderActions
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onSave={handleSave}
              onCancel={handleCancel}
              isSaving={isUpdating}
              canSave={canSave()}
            />
          </div>
          {/* Mobile actions — only when not editing */}
          {!isEditing && (
            <div className="sm:hidden shrink-0 self-start xs:self-auto">
              <ShippingHeaderActions
                isEditing={isEditing}
                onEdit={() => setIsEditing(true)}
                onSave={handleSave}
                onCancel={handleCancel}
                isSaving={isUpdating}
                canSave={canSave()}
              />
            </div>
          )}
        </div>

        {/* Options list */}
        <ShippingOptionsList
          options={shippingOptions}
          isEditing={isEditing}
          currency={shippingConfig?.currency}
          onAdd={addShippingOption}
          onUpdate={updateShippingOption}
          onRemove={removeShippingOption}
        />

        {/* Edit mode tip */}
        {isEditing && (
          <div className="px-5 sm:px-7 py-3.5 bg-blue-50/70 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800/50 flex items-start gap-2.5">
            <div className="w-4 h-4 bg-blue-100 dark:bg-blue-800/50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <svg
                className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Fields marked <span className="text-red-500 font-bold">*</span>{" "}
              are required. Toggle <strong>Available at Checkout</strong> to
              control what customers see when ordering.
              {!canSave() && hasValidated && (
                <span className="block mt-1 text-orange-600 dark:text-orange-400 font-semibold">
                  {!hasChanges()
                    ? "No changes made yet."
                    : "Complete all required fields to save."}
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Mobile sticky save/cancel bar */}
      {isEditing && (
        <>
          <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 shadow-2xl shadow-slate-900/10 px-4 py-3 z-50">
            <ShippingHeaderActions
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onSave={handleSave}
              onCancel={handleCancel}
              isSaving={isUpdating}
              canSave={canSave()}
            />
          </div>
          <div className="sm:hidden h-20" />
        </>
      )}
    </div>
  );
}
