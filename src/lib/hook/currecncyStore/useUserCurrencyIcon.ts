"use client";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStoreCurrency } from "@/lib/hook/currecncyStore/useStoreCurrency";
import { ReactNode } from "react";

// Map all currencies to string symbols or ReactNode (icon component)
const currencyMap: Record<string, string | ReactNode> = {
  BDT: "৳",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

export interface UseUserCurrencyIconResult {
  currency: string | null;
  icon: ReactNode | null; // Now safe to render directly in JSX
  loading: boolean;
  error: Error | null;
}

export function useUserCurrencyIcon(): UseUserCurrencyIconResult {
  const { storeId, loading: userLoading, error: userError } = useCurrentUser();
  const {
    currency,
    loading: currencyLoading,
    error: currencyError,
  } = useStoreCurrency(storeId);

  // Pick the icon or string for the currency
  const icon: ReactNode | null = currency
    ? currencyMap[currency.toUpperCase()] ?? null
    : null;

  return {
    currency: currency || null,
    icon,
    loading: userLoading || currencyLoading,
    error: userError || currencyError,
  };
}
