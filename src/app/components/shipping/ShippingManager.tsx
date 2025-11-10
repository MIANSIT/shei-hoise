// components/admin/ShippingManager.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { useAdminShipping } from "@/lib/hook/deliveryCost/useAdminShipping";
import { ShippingOption } from "@/lib/queries/deliveryCost/getShippingFees";

interface ShippingManagerProps {
  storeSlug: string;
}

export function ShippingManager({ storeSlug }: ShippingManagerProps) {
  const { shippingConfig, loading, error, fetchShippingFees, updateFees } =
    useAdminShipping(storeSlug);

  const [isEditing, setIsEditing] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(0);
  const [processingDays, setProcessingDays] = useState<number>(1);

  useEffect(() => {
    fetchShippingFees();
  }, [storeSlug]);

  useEffect(() => {
    if (shippingConfig) {
      setShippingOptions(shippingConfig.shipping_options);
      setFreeShippingThreshold(shippingConfig.free_shipping_threshold || 0);
      setProcessingDays(shippingConfig.processing_time_days || 1);
    }
  }, [shippingConfig]);

  const addShippingOption = () => {
    setShippingOptions([
      ...shippingOptions,
      { name: "", price: 0, description: "" },
    ]);
  };

  const updateShippingOption = (
    index: number,
    field: keyof ShippingOption,
    value: string | number
  ) => {
    const updated = [...shippingOptions];
    updated[index] = { ...updated[index], [field]: value };
    setShippingOptions(updated);
  };

  const removeShippingOption = (index: number) => {
    setShippingOptions(shippingOptions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const success = await updateFees({
      shipping_options: shippingOptions,
      free_shipping_threshold: freeShippingThreshold,
      processing_time_days: processingDays,
    });

    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (shippingConfig) {
      setShippingOptions(shippingConfig.shipping_options);
      setFreeShippingThreshold(shippingConfig.free_shipping_threshold || 0);
      setProcessingDays(shippingConfig.processing_time_days || 1);
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={fetchShippingFees}
          className="mt-2 text-red-500 text-sm underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Shipping Fees Management</h2>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Shipping</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleCancel}
              className="flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        )}
      </div>

      {/* Free Shipping Threshold */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Free Shipping Threshold ({shippingConfig?.currency})
        </label>
        {isEditing ? (
          <input
            type="number"
            value={freeShippingThreshold}
            onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
        ) : (
          <p className="text-gray-900">{freeShippingThreshold || "Not set"}</p>
        )}
      </div>

      {/* Processing Time */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Processing Time (Days)
        </label>
        {isEditing ? (
          <input
            type="number"
            value={processingDays}
            onChange={(e) => setProcessingDays(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
          />
        ) : (
          <p className="text-gray-900">{processingDays} days</p>
        )}
      </div>

      {/* Shipping Options */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Shipping Options</h3>
          {isEditing && (
            <button
              onClick={addShippingOption}
              className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Option</span>
            </button>
          )}
        </div>

        <div className="space-y-4">
          {shippingOptions.map((option, index) => (
            <div
              key={index}
              className="flex items-center space-x-4 p-4 border rounded-lg"
            >
              {isEditing ? (
                <>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={option.name}
                        onChange={(e) =>
                          updateShippingOption(index, "name", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Inside Dhaka"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price ({shippingConfig?.currency})
                      </label>
                      <input
                        type="number"
                        value={option.price}
                        onChange={(e) =>
                          updateShippingOption(
                            index,
                            "price",
                            Number(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={option.description || ""}
                        onChange={(e) =>
                          updateShippingOption(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional description"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeShippingOption(index)}
                    className="text-red-600 hover:text-red-800 p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <h4 className="font-medium">{option.name}</h4>
                    {option.description && (
                      <p className="text-sm text-gray-600">
                        {option.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {option.price === 0
                        ? "FREE"
                        : `${shippingConfig?.currency} ${option.price}`}
                    </p>
                  </div>
                </>
              )}
            </div>
          ))}

          {shippingOptions.length === 0 && !isEditing && (
            <div className="text-center py-8 text-gray-500">
              No shipping options configured
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
