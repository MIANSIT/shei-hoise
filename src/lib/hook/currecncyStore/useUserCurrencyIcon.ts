"use client";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStoreCurrency } from "@/lib/hook/currecncyStore/useStoreCurrency";
import { DollarOutlined } from "@ant-design/icons";
import { ElementType } from "react";

// Map all currencies to string symbols or React components
const currencyMap: Record<string, string | ElementType> = {
  BDT: "৳",
  USD: DollarOutlined,
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

export interface UseUserCurrencyIconResult {
  currency: string | null;
  icon: string | ElementType | null;
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

  const icon = currency ? currencyMap[currency.toUpperCase()] || null : null;

  return {
    currency: currency || null,
    icon,
    loading: userLoading || currencyLoading,
    error: userError || currencyError,
  };
}
