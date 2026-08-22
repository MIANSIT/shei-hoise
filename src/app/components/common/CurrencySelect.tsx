// components/common/CurrencySelect.tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { memo } from "react";

interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

// Only BDT is actually supported today (see Currency enum in lib/types/enums.ts) —
// the rest are shown, disabled, so the picker reads as "more coming later" rather
// than "this field only has one possible value."
const CURRENCIES: CurrencyOption[] = [
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
];

interface CurrencySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  defaultCurrency?: string;
  /** When set, every option other than this one is shown but disabled. */
  lockToCurrency?: string;
  className?: string;
}

function CurrencySelectComponent({
  value,
  onValueChange,
  disabled = false,
  defaultCurrency = "BDT",
  lockToCurrency,
  className,
}: CurrencySelectProps) {
  const selected = CURRENCIES.find((c) => c.code === (value || defaultCurrency));

  return (
    <Select
      value={value || defaultCurrency}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger size="lg" className={className}>
        {/* Explicit children here keep the trigger compact (symbol + code) —
            without this Radix mirrors the full multi-span SelectItem below
            into the trigger, which overflows a narrow control. */}
        <SelectValue placeholder="Select currency">
          {selected && (
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-chart-2">{selected.symbol}</span>
              <span>{selected.code}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map((currency) => (
          <SelectItem
            key={currency.code}
            value={currency.code}
            disabled={lockToCurrency ? currency.code !== lockToCurrency : false}
          >
            <span className="w-4 font-semibold text-chart-2">{currency.symbol}</span>
            <span>{currency.name}</span>
            <span className="text-muted-foreground">({currency.code})</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const CurrencySelect = memo(CurrencySelectComponent);
