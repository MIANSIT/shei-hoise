"use client";

import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
}

const SIZES: Record<NonNullable<StarRatingProps["size"]>, string> = {
  sm: "w-3.5 h-3.5",
  md: "w-5 h-5",
  lg: "w-7 h-7",
};

/** Read-only when `onChange` is omitted, an interactive 1–5 picker otherwise. */
export function StarRating({ value, onChange, size = "md" }: StarRatingProps) {
  const interactive = Boolean(onChange);
  const starClass = SIZES[size];

  return (
    <div className="flex items-center gap-0.5" role={interactive ? "radiogroup" : undefined}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < Math.round(value);
        const star = (
          <Star
            className={`${starClass} ${
              filled
                ? "fill-amber-400 text-amber-400"
                : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
            }`}
          />
        );

        if (!interactive) return <span key={i}>{star}</span>;

        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i + 1 === value}
            aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
            onClick={() => onChange?.(i + 1)}
            className="p-0.5 hover:scale-110 transition-transform"
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
