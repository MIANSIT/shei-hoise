// hooks/use-media-query.ts
"use client";

import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  // subscribe to media query changes
  const subscribe = (callback: () => void) => {
    if (typeof window === "undefined") return () => {};

    const media = window.matchMedia(query);
    const listener = () => callback();

    if (media.addEventListener) {
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    } else {
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  };

  // get current snapshot of media query
  const getSnapshot = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  };

  return useSyncExternalStore(subscribe, getSnapshot);
}
