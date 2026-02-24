"use client";

import { Check } from "lucide-react";

export const COLOR_PALETTE = [
  { hex: "#6366f1", label: "Indigo" },
  { hex: "#8b5cf6", label: "Violet" },
  { hex: "#ec4899", label: "Pink" },
  { hex: "#ef4444", label: "Red" },
  { hex: "#f97316", label: "Orange" },
  { hex: "#f59e0b", label: "Amber" },
  { hex: "#eab308", label: "Yellow" },
  { hex: "#84cc16", label: "Lime" },
  { hex: "#10b981", label: "Emerald" },
  { hex: "#14b8a6", label: "Teal" },
  { hex: "#06b6d4", label: "Cyan" },
  { hex: "#3b82f6", label: "Blue" },
  { hex: "#0ea5e9", label: "Sky" },
  { hex: "#64748b", label: "Slate" },
  { hex: "#78716c", label: "Stone" },
  { hex: "#1a1a1a", label: "Charcoal" },
];

export const DEFAULT_COLOR = COLOR_PALETTE[0].hex;

interface ColorPickerProps {
  value?: string;
  onChange?: (val: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const selected = value || DEFAULT_COLOR;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-8 gap-2">
        {COLOR_PALETTE.map(({ hex, label }) => {
          const isSelected = selected === hex;
          return (
            <button
              key={hex}
              type="button"
              title={label}
              onClick={() => onChange?.(hex)}
              className={`
                relative w-full aspect-square rounded-xl transition-all duration-150 cursor-pointer
                ${isSelected
                  ? "scale-110 shadow-lg"
                  : "hover:scale-110 hover:shadow-md opacity-80 hover:opacity-100"
                }
              `}
              style={{
                background: hex,
                // ✅ ring via boxShadow — avoids invalid ringColor TS error
                boxShadow: isSelected
                  ? `0 0 0 2px white, 0 0 0 4px ${hex}`
                  : undefined,
              }}
            >
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Check size={11} strokeWidth={3.5} className="text-white drop-shadow" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected label */}
      <div className="flex items-center gap-2">
        <span
          className="w-4 h-4 rounded-md shadow-sm shrink-0 border border-white/20"
          style={{ background: selected }}
        />
        <span className="text-xs font-semibold text-gray-600 dark:text-zinc-300">
          {COLOR_PALETTE.find((c) => c.hex === selected)?.label ?? "Custom"}
        </span>
        <span className="text-xs text-gray-400 dark:text-zinc-600 font-mono">
          {selected}
        </span>
      </div>
    </div>
  );
}