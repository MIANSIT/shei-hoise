import { Settings } from "lucide-react";

interface SettingItemProps {
  label: string;
  value?: string | number | null;
  icon?: React.ReactNode;
  fallback?: string; // optional custom text
}

export default function SettingItem({
  label,
  value,
  icon,
  fallback = "Not provided",
}: SettingItemProps) {
  const displayValue =
    value === null || value === undefined || value === "" ? fallback : value;

  const isEmpty = value === null || value === undefined || value === "";

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        {icon && <div className="text-gray-400">{icon}</div>}
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p
            className={`text-base font-medium ${
              isEmpty ? "text-gray-400 italic" : "text-gray-900"
            }`}
          >
            {displayValue}
          </p>
        </div>
      </div>
      <button className="text-gray-400 hover:text-gray-600 transition-colors">
        <Settings className="w-4 h-4" />
      </button>
    </div>
  );
}
