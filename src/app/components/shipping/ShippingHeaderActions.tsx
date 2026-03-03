import { Save, X, Settings } from "lucide-react";

interface ShippingHeaderActionsProps {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  canSave?: boolean;
}

export function ShippingHeaderActions({
  isEditing,
  onEdit,
  onSave,
  onCancel,
  isSaving = false,
  canSave = false,
}: ShippingHeaderActionsProps) {
  if (!isEditing) {
    return (
      <button
        onClick={onEdit}
        className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500/30 group"
      >
        <Settings className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
        <span>Configure</span>
      </button>
    );
  }

  return (
    <div className="flex gap-2 w-full sm:w-auto">
      <button
        onClick={onCancel}
        disabled={isSaving}
        className="flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
      >
        <X className="h-4 w-4" />
        <span>Cancel</span>
      </button>
      <button
        onClick={onSave}
        disabled={isSaving || !canSave}
        className="flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm shadow-emerald-500/20 hover:shadow-md hover:shadow-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex-1 sm:flex-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      >
        {isSaving ? (
          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        <span>{isSaving ? "Saving…" : "Save"}</span>
      </button>
    </div>
  );
}
