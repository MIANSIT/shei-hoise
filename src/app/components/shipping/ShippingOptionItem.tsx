import { Trash2 } from "lucide-react";
import { ShippingOption } from "@/lib/queries/deliveryCost/getShippingFees";

interface ShippingOptionItemProps {
  option: ShippingOption;
  index: number;
  isEditing: boolean;
  currency?: string;
  onUpdate: (
    index: number,
    field: keyof ShippingOption,
    value: string | number | undefined
  ) => void;
  onRemove: (index: number) => void;
}

export function ShippingOptionItem({
  option,
  index,
  isEditing,
  currency,
  onUpdate,
  onRemove,
}: ShippingOptionItemProps) {
  if (isEditing) {
    return (
      <div className="group relative border border-gray-200 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Input Fields */}
          <div className="flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
              {/* Shipping Method */}
              <div className="lg:col-span-6 space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Shipping Method <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={option.name}
                  onChange={(e) => onUpdate(index, "name", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400"
                  placeholder="Express Delivery, Standard, etc."
                  required
                />
              </div>

              {/* Cost */}
              <div className="lg:col-span-3 space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Cost ({currency}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={option.price}
                  onChange={(e) =>
                    onUpdate(index, "price", Number(e.target.value))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Estimated Days */}
              <div className="lg:col-span-2 space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Estimated Days
                </label>
                <input
                  type="number"
                  value={option.estimated_days ?? ""}
                  onChange={(e) =>
                    onUpdate(
                      index,
                      "estimated_days",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  min="0"
                  placeholder="Optional"
                />
              </div>

              {/* Delete Button */}
              <div className="lg:col-span-1 flex items-center justify-center lg:justify-end pt-2">
                <button
                  onClick={() => onRemove(index)}
                  className="w-12 h-12 flex items-center justify-center border border-red-200 !text-red-500 rounded-xl hover:border-red-300 hover:text-red-600 transition-all duration-200"
                  type="button"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Free Shipping Badge */}
            {option.price === 0 && (
              <div className="mt-4 flex items-center justify-start">
                <div className="inline-flex items-center space-x-2 text-green-700 px-3 py-2 rounded-lg border border-green-200 bg-green-50">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Free Shipping</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // View Mode
  return (
    <div className="group border border-gray-200 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-300 text-lg">
              {option.name}
            </h4>
            <p className="text-gray-500 text-sm mt-1">
              {option.price === 0 ? "Free delivery" : "Standard delivery"}
            </p>
            <p className="text-gray-400  text-sm mt-1">
              Estimated Days:{" "}
              {option.estimated_days !== undefined
                ? `${option.estimated_days} day${
                    option.estimated_days > 1 ? "s" : ""
                  }`
                : "None"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div
            className={`px-5 py-3 rounded-xl border ${
              option.price === 0
                ? "text-green-700 border-green-200"
                : "text-blue-700 border-blue-200"
            }`}
          >
            <p className="font-bold text-lg">
              {option.price === 0
                ? "FREE"
                : `${currency} ${option.price.toFixed(2)}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
