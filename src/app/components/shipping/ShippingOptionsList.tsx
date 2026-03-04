"use client";

import { Plus, Package } from "lucide-react";
import { ShippingOption } from "@/lib/queries/deliveryCost/getShippingFees";
import { ShippingOptionItem } from "./ShippingOptionItem";

interface ShippingOptionsListProps {
  options: ShippingOption[];
  isEditing: boolean;
  currency?: string;
  onAdd: () => void;
  onUpdate: (
    index: number,
    field: keyof ShippingOption,
    value: string | number | boolean | undefined,
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
  return (
    <div className="p-4 sm:p-6 space-y-3">
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

      {/* Empty — view mode */}
      {options.length === 0 && !isEditing && (
        <div className="text-center py-14 sm:py-20">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-slate-300 dark:text-slate-500" />
          </div>
          <h4 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
            No Shipping Methods
          </h4>
          <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
            Click{" "}
            <strong className="text-slate-600 dark:text-slate-300">
              Configure
            </strong>{" "}
            to add your first delivery option.
          </p>
        </div>
      )}

      {/* Empty — edit mode */}
      {options.length === 0 && isEditing && (
        <div
          onClick={onAdd}
          className="text-center py-12 sm:py-16 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 group"
        >
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
            <Plus className="h-6 w-6 text-blue-400 dark:text-blue-500 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
          </div>
          <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">
            No methods yet
          </h4>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Click here or use the button below to add one
          </p>
        </div>
      )}

      {/* Add button — edit mode */}
      {isEditing && (
        <button
          onClick={onAdd}
          type="button"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-all duration-200 text-sm font-medium group"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 group-hover:scale-110" />
          Add Shipping Method
        </button>
      )}
    </div>
  );
}
