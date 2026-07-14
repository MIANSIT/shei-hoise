import type { ReactNode } from "react";

interface VendorStatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  accent: string;
  hint?: string;
}

export function VendorStatCard({ icon, label, value, accent, hint }: VendorStatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: accent }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-lg font-bold text-gray-900 dark:text-white truncate">{value}</div>
        {hint && <div className="text-xs text-gray-400 dark:text-gray-500">{hint}</div>}
      </div>
    </div>
  );
}

export default VendorStatCard;
