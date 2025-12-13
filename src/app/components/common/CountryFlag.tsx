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

interface CountrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  defaultCountry?: string;
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
}: CountrySelectProps) {
  return (
    <Select 
      value={value || defaultCountry} 
      onValueChange={onValueChange} 
      disabled={disabled}
    >
      <SelectTrigger size="lg">
        <SelectValue placeholder="Select country" />
      </SelectTrigger>
      <SelectContent>
        {COUNTRIES.map((country) => (
          <SelectItem key={country.code} value={country.name}>
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