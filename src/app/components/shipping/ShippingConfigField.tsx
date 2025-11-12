interface ShippingConfigFieldProps {
  label: string;
  value: string | number;
  isEditing: boolean;
  type?: "text" | "number";
  placeholder?: string;
  min?: number;
  suffix?: string;
  onChange: (value: number) => void;
}

export function ShippingConfigField({
  label,
  value,
  isEditing,
  type = "number",
  placeholder,
  min,
  suffix,
  onChange,
}: ShippingConfigFieldProps) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      {isEditing ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder={placeholder}
          min={min}
        />
      ) : (
        <p className="text-gray-900">
          {value} {suffix && suffix}
        </p>
      )}
    </div>
  );
}
