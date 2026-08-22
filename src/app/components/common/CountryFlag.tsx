// components/common/CountryFlag.tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactCountryFlag from "react-country-flag";
import { memo } from "react";
import { cn } from "@/lib/utils";

interface CountrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  defaultCountry?: string;
  /** When set, every option other than this one is shown but disabled. */
  lockToCountry?: string;
  className?: string;
}

const COUNTRIES = [
  { code: "AU", name: "Australia" },
  { code: "BD", name: "Bangladesh" },
  { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" },
  { code: "CN", name: "China" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "IN", name: "India" },
  { code: "JP", name: "Japan" },
  { code: "US", name: "United States" },
];

function CountryFlagComponent({
  value,
  onValueChange,
  disabled = false,
  defaultCountry = "Bangladesh",
  lockToCountry,
  className,
}: CountrySelectProps) {
  return (
    <Select
      value={value || defaultCountry}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger size="lg" className={className}>
        <SelectValue placeholder="Select country" />
      </SelectTrigger>
      <SelectContent>
        {COUNTRIES.map((country) => (
          <SelectItem
            key={country.code}
            value={country.name}
            disabled={lockToCountry ? country.name !== lockToCountry : false}
          >
            <div className="flex items-center gap-2">
              <ReactCountryFlag
                countryCode={country.code}
                style={{
                  width: "1.5em",
                  height: "1.5em",
                }}
                svg
              />
              <span>{country.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const CountryFlag = memo(CountryFlagComponent);

/** Read-only "flag + name" for display cards — no dropdown, just the badge look. */
function CountryFlagBadgeComponent({
  country,
  className,
}: {
  country: string;
  className?: string;
}) {
  const code = COUNTRIES.find((c) => c.name === country)?.code;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {code && (
        <ReactCountryFlag
          countryCode={code}
          style={{ width: "1.1em", height: "1.1em" }}
          svg
        />
      )}
      {country}
    </span>
  );
}

export const CountryFlagBadge = memo(CountryFlagBadgeComponent);