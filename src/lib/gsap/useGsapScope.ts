"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Registering twice is harmless, and doing it at module scope means every
// consumer gets the plugin without each remembering to register it.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/** Everything a scope callback needs, without importing gsap at the call site. */
export interface GsapScopeContext {
  /** Scoped selector — only matches inside the returned ref's element. */
  q: gsap.utils.SelectorFunc;
  /** The scope element itself. */
  root: HTMLElement;
  /** True when the visitor asked their OS to reduce motion. */
  reduced: boolean;
  gsap: typeof gsap;
}

/**
 * Runs a GSAP setup callback scoped to one element, cleaned up on unmount.
 *
 * Three things this handles that hand-rolled `useEffect` + `gsap.to` does not:
 *
 * 1. **Cleanup.** Everything created inside the callback is reverted when the
 *    component unmounts or deps change — including ScrollTriggers, which
 *    otherwise survive navigation and fire against detached nodes.
 *
 * 2. **Reduced motion.** `gsap.matchMedia` runs a separate branch for
 *    `prefers-reduced-motion: reduce`, where the callback is told to set end
 *    states instead of tweening. GSAP animates inline styles, so the CSS
 *    override in globals.css cannot reach it — this is the only way that
 *    setting is honoured on the marketing pages.
 *
 * 3. **`useLayoutEffect`.** Entrance animations set opacity to 0 on their
 *    targets. Doing that in `useEffect` means the browser can paint the
 *    element at full opacity first, producing a flash of content that then
 *    disappears to animate back in.
 *
 * @example
 * const scope = useGsapScope(({ q, reduced }) => {
 *   if (reduced) { gsap.set(q(".card"), { opacity: 1, y: 0 }); return; }
 *   gsap.from(q(".card"), { opacity: 0, y: 20, stagger: 0.06 });
 * });
 * return <div ref={scope}>…</div>;
 */
export function useGsapScope(
  setup: (context: GsapScopeContext) => void | (() => void),
  deps: React.DependencyList = [],
) {
  const ref = useRef<HTMLElement>(null);
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const mm = gsap.matchMedia();
    const q = gsap.utils.selector(root);

    mm.add(
      {
        motionOk: "(prefers-reduced-motion: no-preference)",
        motionReduced: "(prefers-reduced-motion: reduce)",
      },
      (mmContext) => {
        const { motionReduced } = mmContext.conditions as {
          motionOk: boolean;
          motionReduced: boolean;
        };
        // Returned so a setup's own cleanup (timers, SplitText reverts,
        // listeners) is run by GSAP when the media context is reverted —
        // without this the callback's return value is silently discarded.
        return setupRef.current({ q, root, reduced: motionReduced, gsap });
      },
    );

    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/**
 * Counts a number up as it scrolls into view.
 *
 * Split out because it is the single most repeated request on a marketing
 * page and the naive version — tweening a number and writing it with
 * `toFixed` — loses thousands separators and the "+" / "k" suffixes the copy
 * depends on. Feed it the display string ("500+", "10k+", "৳6,801") and it
 * animates only the numeric part, leaving prefix and suffix intact.
 */
export function countUpTo(
  element: HTMLElement,
  displayValue: string,
  options: { duration?: number; reduced?: boolean } = {},
) {
  const { duration = 1.4, reduced = false } = options;

  const match = displayValue.match(/^([^\d]*)([\d,.]+)(.*)$/);
  if (!match) {
    element.textContent = displayValue;
    return;
  }

  const [, prefix, rawNumber, suffix] = match;
  const target = Number(rawNumber.replace(/,/g, ""));
  if (!Number.isFinite(target)) {
    element.textContent = displayValue;
    return;
  }

  const hasSeparators = rawNumber.includes(",");
  const format = (value: number) => {
    const rounded = Math.round(value);
    return (
      prefix +
      (hasSeparators ? rounded.toLocaleString("en-US") : String(rounded)) +
      suffix
    );
  };

  if (reduced) {
    element.textContent = displayValue;
    return;
  }

  const counter = { value: 0 };
  gsap.to(counter, {
    value: target,
    duration,
    ease: "power2.out",
    onUpdate: () => {
      element.textContent = format(counter.value);
    },
    onComplete: () => {
      // Snap to the authored string so any formatting the parser could not
      // reproduce survives — the copy is the source of truth, not the maths.
      element.textContent = displayValue;
    },
  });
}
