// components/common/PillField.tsx
"use client";

import { cn } from "@/lib/utils";

interface PillFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  rightElement?: React.ReactNode;
  className?: string;
}

export function PillField({
  id,
  label,
  value,
  onChange,
  onKeyPress,
  type = "text",
  placeholder,
  disabled,
  autoFocus,
  rightElement,
  className,
}: PillFieldProps) {
  return (
    <div className={cn("relative", className)}>
      <span className="absolute -top-2.5 left-4 z-10 bg-card px-1.5 text-xs font-semibold text-chart-2">
        {label}
      </span>
      <div className="flex h-12 items-center gap-2 rounded-full border-2 border-chart-2 bg-transparent px-4 transition-shadow focus-within:ring-[3px] focus-within:ring-chart-2/20">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="min-w-0 flex-1 bg-transparent text-base tracking-wide outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
        {rightElement}
      </div>
    </div>
  );
}
