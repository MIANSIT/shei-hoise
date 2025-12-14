// app/components/admin/store-settings/SettingItem.tsx
export function SettingItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-medium">{value}</p>
    </div>
  );
}
