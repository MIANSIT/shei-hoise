import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Persists form state to localStorage under `key`.
 * Returns [value, setValue, clearDraft, hasDraft].
 * Restores saved state on first mount; clears it after a successful save.
 */
export function useLocalDraft<T>(
  key: string,
  initialValue: T,
): [T, (v: T | ((prev: T) => T)) => void, () => void, boolean] {
  const [hasDraft, setHasDraft] = useState(false);

  const [value, setValueRaw] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setHasDraft(true); // will be overridden by useEffect but sets initial
        return JSON.parse(saved) as T;
      }
    } catch {}
    return initialValue;
  });

  // Track whether we actually restored a draft on mount
  const restored = useRef(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        restored.current = true;
        setHasDraft(true);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setValue = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValueRaw((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [key],
  );

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {}
    setHasDraft(false);
  }, [key]);

  return [value, setValue, clearDraft, hasDraft];
}
