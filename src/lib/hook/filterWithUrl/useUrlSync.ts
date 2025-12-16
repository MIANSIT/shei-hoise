"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useEffect } from "react";

/**
 * useUrlSync: A hook to sync any state with URL query params
 *
 * @param key - The query parameter key
 * @param defaultValue - Default value if not in URL
 * @param parseFn - Optional function to parse string from URL
 * @param debounceMs - Optional debounce delay in milliseconds
 */
export function useUrlSync<T>(
  key: string,
  defaultValue: T,
  parseFn: (value: string | null) => T = (v) => v as unknown as T,
  debounceMs: number = 0
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current value from URL
  const value = useMemo(() => {
    const param = searchParams.get(key);
    return param !== null ? parseFn(param) : defaultValue;
  }, [searchParams, key, defaultValue, parseFn]);

  // Set new value and update URL without full reload
  const setValue = useCallback(
    (newValue: T | null) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const updateUrl = () => {
        const params = new URLSearchParams(searchParams.toString());

        if (newValue === defaultValue || newValue === null) {
          params.delete(key);
        } else {
          params.set(key, String(newValue));
        }

        router.replace(`?${params.toString()}`);
      };

      if (debounceMs > 0) {
        timeoutRef.current = setTimeout(updateUrl, debounceMs);
      } else {
        updateUrl();
      }
    },
    [router, searchParams, key, defaultValue, debounceMs]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, setValue] as const;
}

// Helper function to parse integer from URL
export function parseInteger(value: string | null): number {
  if (!value) return 1;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 1 : Math.max(1, parsed); // Ensure at least 1
}
