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
        className="group relative flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-400 to-blue-500 !text-white px-4 sm:px-6 py-3 rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 focus:outline-none focus:ring-4 focus:ring-blue-500/20 font-medium w-full sm:w-auto text-sm sm:text-base"
      >
        <div className="relative z-10 flex items-center space-x-2">
          <Settings className="h-4 w-4 sm:h-4 sm:w-4 transition-transform group-hover:rotate-90" />
          <span>Configure Shipping</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-800 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </button>
    );
  }

  return (
    <div className="flex gap-2 sm:gap-3 w-full">
      <button
        onClick={onCancel}
        disabled={isSaving}
        className="flex items-center justify-center space-x-2 bg-gradient-to-r from-red-400 to-red-500 !text-white px-4 sm:px-6 py-3 rounded-xl hover:from-red-500 hover:to-red-600 transition-all duration-300 shadow-lg shadow-gray-500/20 hover:shadow-xl hover:shadow-gray-500/30 focus:outline-none focus:ring-4 focus:ring-gray-500/20 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex-1 text-sm sm:text-base"
      >
        <X className="h-4 w-4 sm:h-4 sm:w-4" />
        <span className="sm:inline">Cancel</span>
      </button>
      <button
        onClick={onSave}
        disabled={isSaving || !canSave}
        className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 !text-white px-4 sm:px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 focus:outline-none focus:ring-4 focus:ring-green-500/20 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex-1 text-sm sm:text-base"
      >
        {isSaving ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        ) : (
          <Save className="h-4 w-4 sm:h-4 sm:w-4" />
        )}
        <span className="sm:inline">{isSaving ? "Saving..." : "Save"}</span>
      </button>
    </div>
  );
}
