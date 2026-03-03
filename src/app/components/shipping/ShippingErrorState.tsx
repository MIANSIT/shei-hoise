// ShippingErrorState.tsx
import { AlertCircle, RefreshCw } from "lucide-react";

interface ShippingErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function ShippingErrorState({
  error,
  onRetry,
}: ShippingErrorStateProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-100 dark:border-red-900/40 shadow-sm p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="w-11 h-11 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
            Failed to load shipping data
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            {error}
          </p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm shadow-red-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
