import { Plus, Package } from "lucide-react";
import { ShippingOption } from "@/lib/queries/deliveryCost/getShippingFees";
import { ShippingOptionItem } from "./ShippingOptionItem";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

interface ShippingOptionsListProps {
  options: ShippingOption[];
  isEditing: boolean;
  currency?: string;
  onAdd: () => void;
  onUpdate: (
    index: number,
    field: keyof ShippingOption,
    value: string | number
  ) => void;
  onRemove: (index: number) => void;
}

export function ShippingOptionsList({
  options,
  isEditing,
  currency,
  onAdd,
  onUpdate,
  onRemove,
}: ShippingOptionsListProps) {
  const { info } = useSheiNotification();

  const handleAdd = () => {
    onAdd();
    info("New shipping option added. Fill in the details.");
  };

  return (
    <div>
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 sm:p-8 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/80 to-gray-100/30 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
              Shipping Methods
            </h3>
            <p className="text-gray-600 text-[15px] mt-1">
              Configure delivery options and pricing
            </p>
          </div>
        </div>
        {isEditing && (
          <button
            onClick={handleAdd}
            className="group flex items-center justify-center space-x-3 bg-gradient-to-r from-green-500 to-emerald-600 !text-white px-6 py-4 rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 font-semibold text-[15px] w-full sm:w-auto backdrop-blur-sm"
            type="button"
          >
            <Plus className="h-5 w-5 transition-transform group-hover:scale-110 group-hover:rotate-90" />
            <span>Add Shipping Method</span>
          </button>
        )}
      </div>

      {/* Premium Content */}
      <div className="p-2">
        <div className="space-y-4 sm:space-y-6">
          {options.map((option, index) => (
            <ShippingOptionItem
              key={index}
              option={option}
              index={index}
              isEditing={isEditing}
              currency={currency}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}

          {options.length === 0 && !isEditing && (
            <div className="text-center py-16 sm:py-24">
              <div className="w-24 h-24 bg-gradient-to-r from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Package className="h-12 w-12 text-gray-400" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                No Shipping Methods
              </h4>
              <p className="text-gray-600 max-w-md mx-auto text-[15px] leading-relaxed">
                Get started by configuring your shipping options to offer
                delivery methods to your customers.
              </p>
            </div>
          )}

          {options.length === 0 && isEditing && (
            <div className="text-center py-16 sm:py-24 border-2 border-dashed border-gray-300/50 rounded-3xl bg-gradient-to-br from-gray-50/30 to-gray-100/10 backdrop-blur-sm">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Plus className="h-12 w-12 text-blue-500" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                Ready to Create
              </h4>
              <p className="text-gray-600 max-w-md mx-auto mb-8 text-[15px] leading-relaxed">
                Add your first shipping method to start offering delivery
                options to customers.
              </p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-blue-500/25 font-semibold text-[15px] backdrop-blur-sm"
              >
                <Plus className="h-5 w-5" />
                <span>Create First Method</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
