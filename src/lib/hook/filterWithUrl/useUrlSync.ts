"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo, useRef, useEffect } from "react";

// Global state for URL updates
const pendingUpdates: Map<string, string | null> = new Map();
let isProcessing = false;

async function processPendingUpdates(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  currentParamsRef: React.RefObject<string>
) {
  if (isProcessing || pendingUpdates.size === 0) return;

  isProcessing = true;

  try {
    // Get current params
    const params = new URLSearchParams(currentParamsRef.current);

    console.log("🔄 Processing pending updates:", {
      pending: Object.fromEntries(pendingUpdates),
      currentParams: params.toString(),
    });

    // Apply all pending updates
    pendingUpdates.forEach((value, key) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Clear pending updates
    pendingUpdates.clear();

    // Update the ref
    const newParamsString = params.toString();
    currentParamsRef.current = newParamsString;

    // Create the new URL
    const queryString = newParamsString;
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    console.log("🔗 Final URL after batch update:", newUrl);

    // Update the URL
    await router.replace(newUrl, {
      scroll: false,
    });
  } finally {
    isProcessing = false;

    // Check if new updates came in while processing
    if (pendingUpdates.size > 0) {
      setTimeout(
        () => processPendingUpdates(router, pathname, currentParamsRef),
        10
      );
    }
  }
}

/**
 * useUrlSync: A hook to sync any state with URL query params
 * Fixed with batched updates to prevent race conditions
 */
export function useUrlSync<T>(
  key: string,
  defaultValue: T,
  parseFn: (value: string | null) => T = (v) => v as unknown as T,
  debounceMs: number = 0
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentParamsRef = useRef<string>(searchParams.toString());

  // Update ref whenever searchParams change
  useEffect(() => {
    currentParamsRef.current = searchParams.toString();
  }, [searchParams]);

  // Get current value from URL
  const value = useMemo(() => {
    const param = searchParams.get(key);
    return param !== null ? parseFn(param) : defaultValue;
  }, [searchParams, key, defaultValue, parseFn]);

  // Set new value and update URL
  const setValue = useCallback(
    (newValue: T | null) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const scheduleUpdate = () => {
        // For pagination params, NEVER delete them
        if (key === "page" || key === "pageSize") {
          if (newValue !== null && newValue !== undefined) {
            pendingUpdates.set(key, String(newValue));
          }
        }
        // For other params
        else if (
          newValue === defaultValue ||
          newValue === null ||
          newValue === "" ||
          newValue === undefined
        ) {
          pendingUpdates.set(key, null); // Mark for deletion
        } else {
          pendingUpdates.set(key, String(newValue));
        }

        console.log(`📝 Scheduled update [${key}]:`, {
          newValue,
          pendingUpdates: Object.fromEntries(pendingUpdates),
        });

        // Process updates with a small delay to allow batching
        setTimeout(() => {
          processPendingUpdates(router, pathname, currentParamsRef);
        }, 10);
      };

      if (debounceMs > 0) {
        timeoutRef.current = setTimeout(scheduleUpdate, debounceMs);
      } else {
        scheduleUpdate();
      }
    },
    [router, pathname, key, defaultValue, debounceMs]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, setValue] as const;
}

export function parseInteger(value: string | null): number {
  if (!value) return 1;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 1 : Math.max(1, parsed);
}
