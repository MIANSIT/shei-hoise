"use client";

export function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 m-0 mb-0.5">
          {label}
        </p>
        <div className="text-sm text-gray-800 dark:text-gray-100 font-medium">
          {children}
        </div>
      </div>
    </div>
  );
}
