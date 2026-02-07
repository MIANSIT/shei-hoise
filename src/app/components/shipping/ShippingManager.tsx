"use client";

import { useState, useEffect, useRef } from "react";
import { useAdminShipping } from "@/lib/hook/deliveryCost/useAdminShipping";
import { ShippingOption } from "@/lib/queries/deliveryCost/getShippingFees";
import { ShippingHeaderActions } from "@/app/components/shipping/ShippingHeaderActions";
import { ShippingOptionsList } from "@/app/components/shipping/ShippingOptionsList";
import { ShippingLoadingState } from "@/app/components/shipping/ShippingLoadingState";
import { ShippingErrorState } from "@/app/components/shipping/ShippingErrorState";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

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

  // Use ref to track initial fetch
  const initialFetchRef = useRef(false);

  // Fix: Only fetch once on mount
  useEffect(() => {
    if (storeSlug && !initialFetchRef.current && !loading) {
      initialFetchRef.current = true;
      refetch();
    }
  }, [storeSlug, loading, refetch]); // Remove refetch from dependencies

  useEffect(() => {
    if (shippingConfig) {
      setShippingOptions(shippingConfig.shipping_options);
    }
  }, [shippingConfig]);

  useEffect(() => {
    if (isEditing) {
      clearError();
      info(
        "You are now in editing mode. Make your changes and save when ready."
      );
      setHasValidated(false);
    }
  }, [isEditing, clearError, info]);

  const hasChanges = () => {
    if (!shippingConfig) return false;
    const currentOptions = JSON.stringify(shippingConfig.shipping_options);
    const editedOptions = JSON.stringify(shippingOptions);
    return currentOptions !== editedOptions;
  };

  const isValidForm = (showWarning = true) => {
    if (shippingOptions.length === 0) {
      if (showWarning) {
        warning("Add at least one shipping option before saving.");
      }
      return false;
    }

    const isValid = shippingOptions.every(
      (option) => option.name.trim() !== "" && option.price >= 0
    );

    if (!isValid && showWarning) {
      warning(
        "Please fill all required fields (Name and Price) for all shipping options."
      );
    }

    return isValid;
  };

  const canSave = () => {
    if (!hasValidated) {
      return hasChanges();
    }
    return hasChanges() && isValidForm(false);
  };

  const addShippingOption = () => {
    setShippingOptions([...shippingOptions, { name: "", price: 0 }]);
    info("New shipping option added. Fill in the details.");
  };

  const updateShippingOption = (
    index: number,
    field: keyof ShippingOption,
    value: string | number | undefined // allow undefined now
  ) => {
    const updated = [...shippingOptions];
    updated[index] = { ...updated[index], [field]: value };
    setShippingOptions(updated);
  };
  const removeShippingOption = (index: number) => {
    const optionName = shippingOptions[index].name || `Option ${index + 1}`;
    setShippingOptions(shippingOptions.filter((_, i) => i !== index));
    info(`Shipping option "${optionName}" removed.`);
  };

  const handleSave = async () => {
    setHasValidated(true);

    if (!hasChanges()) {
      warning("No changes detected to save.");
      return;
    }

    if (!isValidForm(true)) {
      return;
    }

    const validShippingOptions = shippingOptions.filter(
      (option) => option.name.trim() !== "" && option.price >= 0
    );

    const success = await updateFees({
      shipping_options: validShippingOptions,
    });

    if (success) {
      setIsEditing(false);
      setHasValidated(false);
    }
  };

  const handleCancel = () => {
    if (shippingConfig) {
      setShippingOptions(shippingConfig.shipping_options);
    }
    setIsEditing(false);
    clearError();
    setHasValidated(false);
    info("Changes discarded. Back to view mode.");
  };

  if (loading) {
    return <ShippingLoadingState />;
  }

  if (error) {
    return <ShippingErrorState error={error} onRetry={refetch} />;
  }

  return (
    <div className="rounded-3xl border   backdrop-blur-sm shadow-2xl shadow-gray-200/30 p-6  lg:p-10">
      {/* Stats Overview - Better mobile layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">
                Total Options
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {shippingOptions.length}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-linear-to-r from-green-50 to-emerald-50 rounded-xl p-4 sm:p-6 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 mb-1">
                Free Shipping
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {shippingOptions.filter((opt) => opt.price === 0).length}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-linear-to-r from-purple-50 to-violet-50 rounded-xl p-4 sm:p-6 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 mb-1">
                Currency
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {shippingConfig?.currency || "BDT"}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Header - Simplified for mobile */}
      <div className="mb-6 sm:mb-8">
        <div className="text-center sm:text-left mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-400 ">
            Shipping Configuration
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1 sm:mt-2 text-sm sm:text-base">
            Manage delivery methods and shipping costs for your store
          </p>
        </div>

        {/* Edit Button - Always visible and prominent */}
        {!isEditing && (
          <div className="flex justify-center sm:justify-end">
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

      {/* Shipping Options */}
      <div className=" shadow-lg overflow-hidden mb-8 rounded-2xl border">
        <ShippingOptionsList
          options={shippingOptions}
          isEditing={isEditing}
          currency={shippingConfig?.currency}
          onAdd={addShippingOption}
          onUpdate={updateShippingOption}
          onRemove={removeShippingOption}
        />
      </div>

      {/* Save/Cancel Buttons - Fixed position on mobile when editing */}
      {isEditing && (
        <>
          {/* Desktop buttons - in normal flow */}
          <div className="hidden sm:flex justify-end gap-3 mb-6">
            <ShippingHeaderActions
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onSave={handleSave}
              onCancel={handleCancel}
              isSaving={isUpdating}
              canSave={canSave()}
            />
          </div>

          {/* Mobile sticky buttons - fixed at bottom */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-50">
            <div className="flex gap-3">
              <ShippingHeaderActions
                isEditing={isEditing}
                onEdit={() => setIsEditing(true)}
                onSave={handleSave}
                onCancel={handleCancel}
                isSaving={isUpdating}
                canSave={canSave()}
              />
            </div>
          </div>

          {/* Spacer for mobile to prevent content being hidden behind sticky buttons */}
          {/* <div className="sm:hidden h-20"></div> */}
        </>
      )}

      {/* Edit Mode Instructions */}
      {isEditing && (
        <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <svg
                className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600"
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
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-1 sm:mb-2">
                Editing Mode Active
              </p>
              <p className="text-xs sm:text-sm text-blue-800">
                Fill in all required fields (marked with *) before saving. Empty
                shipping options will be automatically removed.
                {!canSave() && hasValidated && (
                  <span className="block mt-1 text-orange-700 font-medium text-xs sm:text-sm">
                    {!hasChanges()
                      ? "No changes made yet"
                      : "Please complete all required fields to save"}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
