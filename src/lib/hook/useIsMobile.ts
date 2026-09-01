"use client";

import { useEffect, useState } from "react";

/**
 * True below Tailwind's `lg` breakpoint (1024px).
 *
 * Needed where an animation must apply on mobile only. Tailwind can hide or
 * show an element per breakpoint, but framer-motion animates inline styles,
 * which no media query can override — so a mobile-only transition has to know
 * the breakpoint in JS.
 *
 * Starts `false` and resolves after mount: `window` doesn't exist during SSR,
 * and guessing would mean animating on the server's assumption rather than the
 * device's reality. Callers should treat the first paint as desktop.
 */
export function useIsMobile(query = "(max-width: 1023px)") {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setIsMobile(media.matches);

    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return isMobile;
}
