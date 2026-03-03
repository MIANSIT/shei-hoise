// ShippingLoadingState.tsx
export function ShippingLoadingState() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-12 sm:p-16 flex flex-col items-center justify-center gap-5">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-700" />
        <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Loading configuration
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Preparing your shipping settings…
        </p>
      </div>
    </div>
  );
}
