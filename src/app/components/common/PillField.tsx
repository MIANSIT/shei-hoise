// components/common/PillField.tsx
"use client";

import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

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
  required?: boolean;
  tooltip?: string;
  error?: string;
  maxLength?: number;
}

function PillLabel({
  label,
  required,
  tooltip,
}: {
  label: string;
  required?: boolean;
  tooltip?: string;
}) {
  return (
    <span className="absolute -top-2.5 left-4 z-10 flex items-center gap-1 bg-card px-1.5 text-xs font-semibold text-chart-2">
      {required && <span className="text-destructive">*</span>}
      {label}
      {tooltip && (
        <span title={tooltip} className="text-muted-foreground cursor-help">
          <Info size={12} />
        </span>
      )}
    </span>
  );
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
  required,
  tooltip,
  error,
  maxLength,
}: PillFieldProps) {
  return (
    <div className={cn("relative", className)}>
      <PillLabel label={label} required={required} tooltip={tooltip} />
      <div
        className={cn(
          "flex h-12 items-center gap-2 rounded-full border-2 bg-transparent px-4 transition-shadow focus-within:ring-[3px]",
          error
            ? "border-destructive focus-within:ring-destructive/20"
            : "border-chart-2 focus-within:ring-chart-2/20",
        )}
      >
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          maxLength={maxLength}
          className="min-w-0 flex-1 bg-transparent text-base tracking-wide outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
        {rightElement}
      </div>
      {error ? (
        <p className="mt-1 ml-4 text-xs text-destructive">{error}</p>
      ) : (
        maxLength && (
          <p className="mt-1 mr-4 text-right text-[11px] text-muted-foreground">
            {value.length}/{maxLength}
          </p>
        )
      )}
    </div>
  );
}

interface PillShellProps {
  label: string;
  required?: boolean;
  tooltip?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

/** Same pill chrome as PillField, but for embedding a custom control (e.g. a Select) instead of a plain input. */
export function PillShell({
  label,
  required,
  tooltip,
  error,
  className,
  children,
}: PillShellProps) {
  return (
    <div className={cn("relative", className)}>
      <PillLabel label={label} required={required} tooltip={tooltip} />
      <div
        className={cn(
          "flex h-12 items-center rounded-full border-2 bg-transparent transition-shadow focus-within:ring-[3px]",
          error
            ? "border-destructive focus-within:ring-destructive/20"
            : "border-chart-2 focus-within:ring-chart-2/20",
        )}
      >
        {children}
      </div>
      {error && <p className="mt-1 ml-4 text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface PillTextAreaProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  tooltip?: string;
  error?: string;
  rows?: number;
  className?: string;
}

export function PillTextArea({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  required,
  tooltip,
  error,
  rows = 3,
  className,
}: PillTextAreaProps) {
  return (
    <div className={cn("relative", className)}>
      <PillLabel label={label} required={required} tooltip={tooltip} />
      <div
        className={cn(
          "rounded-2xl border-2 bg-transparent px-4 py-3 transition-shadow focus-within:ring-[3px]",
          error
            ? "border-destructive focus-within:ring-destructive/20"
            : "border-chart-2 focus-within:ring-chart-2/20",
        )}
      >
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className="w-full resize-none bg-transparent text-base tracking-wide outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      {error && <p className="mt-1 ml-4 text-xs text-destructive">{error}</p>}
    </div>
  );
}
