import { Trash2, Eye, EyeOff, Clock } from "lucide-react";
import { ShippingOption } from "@/lib/queries/deliveryCost/getShippingFees";

interface ShippingOptionItemProps {
  option: ShippingOption;
  index: number;
  isEditing: boolean;
  currency?: string;
  onUpdate: (
    index: number,
    field: keyof ShippingOption,
    value: string | number | boolean | undefined,
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
  const isVisible = option.customer_view !== false;

  if (isEditing) {
    return (
      <div className="border border-slate-200 dark:border-slate-600 rounded-xl p-4 sm:p-5 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500 transition-colors">
        {/* Row 1: Name + price + days */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 sm:gap-4 mb-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Method Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={option.name}
              onChange={(e) => onUpdate(index, "name", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50/50 dark:bg-slate-700/50 placeholder-slate-300 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all"
              placeholder="e.g. Express Delivery"
              required
            />
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Price ({currency ?? "BDT"}){" "}
              <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={option.price}
              onChange={(e) => onUpdate(index, "price", Number(e.target.value))}
              className="w-full sm:w-32 px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50/50 dark:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all"
              min="0"
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>

          {/* Estimated days */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Est. Days
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={option.estimated_days ?? ""}
                onChange={(e) =>
                  onUpdate(index, "estimated_days", e.target.value || undefined)
                }
                className="w-full sm:w-28 pl-8 pr-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50/50 dark:bg-slate-700/50 placeholder-slate-300 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all"
                placeholder="e.g. 2-3"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Toggle + badge + delete */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          {/* Available at Checkout toggle */}
          <button
            type="button"
            onClick={() => onUpdate(index, "customer_view", !isVisible)}
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all duration-200 ${
              isVisible
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                : "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
            title={
              isVisible
                ? "Available at checkout — click to hide"
                : "Not available at checkout — click to enable"
            }
          >
            <span
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors duration-200 shrink-0 ${
                isVisible
                  ? "bg-emerald-400 dark:bg-emerald-500"
                  : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  isVisible ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </span>
            <span>Available at Checkout</span>
          </button>

          {/* Free shipping badge */}
          {option.price === 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <span className="w-1.5 h-1.5 bg-emerald-400 dark:bg-emerald-500 rounded-full" />
              Free Shipping
            </span>
          )}

          <div className="flex-1" />

          {/* Delete */}
          <button
            onClick={() => onRemove(index)}
            type="button"
            title="Remove this shipping option"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-red-100 dark:border-red-900/40 text-red-400 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800/50 hover:text-red-500 transition-all duration-200"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── View mode ──
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 rounded-xl border px-4 sm:px-5 py-4 transition-all ${
        isVisible
          ? "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-sm"
          : "border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/40 opacity-60"
      }`}
    >
      {/* Left: dot + info */}
      <div className="flex items-start sm:items-center gap-3">
        <div
          className={`w-2.5 h-2.5 rounded-full mt-1.5 sm:mt-0 shrink-0 ${
            isVisible
              ? "bg-emerald-400 dark:bg-emerald-500"
              : "bg-slate-300 dark:bg-slate-600"
          }`}
        />
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {option.name}
            </h4>
            {/* Visibility badge */}
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                isVisible
                  ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50"
                  : "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600"
              }`}
            >
              {isVisible ? (
                <>
                  <Eye className="w-3 h-3" /> Available at Checkout
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3" /> Unavailable at Checkout
                </>
              )}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <span>
              {option.price === 0 ? "Free delivery" : "Paid delivery"}
            </span>
            {option.estimated_days && (
              <>
                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {option.estimated_days} day
                  {option.estimated_days !== "1" ? "s" : ""}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: price badge */}
      <div className="self-start sm:self-auto shrink-0 ml-5 sm:ml-0">
        <span
          className={`inline-block px-4 py-2 rounded-xl text-sm font-bold border ${
            option.price === 0
              ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50"
              : "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50"
          }`}
        >
          {option.price === 0
            ? "FREE"
            : `${currency} ${option.price.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}
