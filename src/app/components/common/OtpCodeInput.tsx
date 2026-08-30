"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface OtpCodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  /** Bump this (e.g. on every failed verify attempt) to replay the shake animation. */
  shakeTrigger?: number;
  autoFocus?: boolean;
}

export function OtpCodeInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled,
  hasError,
  shakeTrigger = 0,
  autoFocus,
}: OtpCodeInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  // handleFocus below reads `value` to stop the user clicking/tabbing ahead
  // of the first empty box — but `value` is still the pre-keystroke prop at
  // the instant a programmatic .focus() call fires its focus event (React
  // hasn't re-rendered with the new value yet), so that guard would
  // otherwise immediately bounce our own auto-advance back to box 0. This
  // flag marks a focus() call as ours so handleFocus skips the check for it.
  const focusingProgrammatically = useRef(false);
  const focusInput = (index: number) => {
    focusingProgrammatically.current = true;
    inputsRef.current[index]?.focus();
  };

  useEffect(() => {
    if (autoFocus) focusInput(0);
  }, [autoFocus]);

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;

    const next = (value.slice(0, index) + digit + value.slice(index + 1)).slice(0, length);
    onChange(next);

    if (index < length - 1) {
      focusInput(index + 1);
    } else {
      inputsRef.current[index]?.blur();
    }
    if (next.length === length) onComplete?.(next);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index));
        focusInput(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    focusInput(Math.min(pasted.length, length - 1));
    if (pasted.length === length) onComplete?.(pasted);
  };

  // Clicking ahead of the next empty box would leave a gap in the value
  // string, so redirect focus back to the first unfilled box instead —
  // unless this focus event was one we triggered ourselves (see above).
  const handleFocus = (index: number, e: React.FocusEvent<HTMLInputElement>) => {
    if (focusingProgrammatically.current) {
      focusingProgrammatically.current = false;
      e.target.select();
      return;
    }
    if (index > value.length) {
      focusInput(value.length);
      return;
    }
    e.target.select();
  };

  return (
    <motion.div
      key={shakeTrigger}
      initial={{ x: 0 }}
      animate={hasError ? { x: [0, -8, 8, -8, 8, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex gap-2 sm:gap-3"
    >
      {digits.map((digit, index) => (
        <motion.div
          key={index}
          animate={digit ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: 0.18 }}
        >
          <input
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={(e) => handleFocus(index, e)}
            className={cn(
              "h-12 w-10 rounded-2xl border-2 bg-transparent text-center text-xl font-bold tabular-nums outline-none transition-all duration-150 sm:h-14 sm:w-12",
              "focus:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
              hasError
                ? "border-destructive focus:ring-destructive/20"
                : digit
                ? "border-chart-2 bg-chart-2/5 focus:ring-chart-2/20"
                : "border-border focus:border-chart-2 focus:ring-chart-2/20",
            )}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
