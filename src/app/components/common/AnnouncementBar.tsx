"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { Megaphone } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface AnnouncementBarProps {
  /** Active announcement lines from the store owner's Announcements manager, in display order — shown alongside the auto free-shipping line when that's also set. */
  announcements: string[];
  /** Store settings' free-shipping threshold — auto-composes a line from it. */
  freeShippingThreshold: number | null;
}

/** Ticker scroll speed, in pixels per second. */
const MARQUEE_PX_PER_SEC = 70;
/** Gap between one lap of text and the start of its repeat. */
const MARQUEE_GAP_PX = 64;
/** Width of the fade-to-transparent zone at each edge of the scroll area. */
const EDGE_FADE_PX = 20;

/**
 * One lap's worth of messages. Generously spaced around the bullet, not a
 * bare "•" wedged between two words — the gap itself is what reads as "two
 * separate announcements", the dot is just a faint marker inside that gap.
 */
function AnnouncementLap({ messages }: { messages: string[] }) {
  return (
    <>
      {messages.map((msg, i) => (
        <span key={i}>
          {i > 0 && (
            <span aria-hidden="true" className="inline-block mx-5 sm:mx-6 text-primary/70">
              •
            </span>
          )}
          {msg}
        </span>
      ))}
    </>
  );
}

/**
 * Utility bar shown above the storefront navbar. Combines the store owner's
 * manual announcement lines with, when the store has a free-shipping
 * threshold configured, an auto-composed "Free shipping on orders over ৳X"
 * line — that number can never drift from the real setting since it isn't
 * hand-typed anywhere. Renders nothing when there's nothing to show (see the
 * `showAnnouncement` gate in [store_slug]/layout.tsx, which decides this
 * server-side so the header's offset is correct on first paint).
 *
 * Whatever ends up in the bar — one announcement, several, just the
 * auto-composed free-shipping line, or a mix — scrolls continuously
 * right-to-left as a looping ticker tape (marquee); there's no "too short
 * to bother" static case, so a lone free-shipping line reads the same as
 * everything else. Reduced-motion viewers get the static, non-scrolling
 * version instead, joined by the same wide-spaced bullet when there's more
 * than one line.
 *
 * The number of repeated copies of the text is computed from the *container's*
 * width, not fixed at two — two copies of a short line on a wide screen would
 * leave a stretch of visibly empty bar after them before the loop caught up.
 * Enough copies are rendered to cover the container plus one extra lap, so the
 * bar reads as continuously full text at any screen width, for any number of
 * messages (a single short one included).
 *
 * The store header is `fixed top-0` (see DesktopHeaderforStore/
 * MobileHeaderforStore, each of which reserves its own space with a matching
 * spacer div right after the fixed element) — a normal-flow bar placed
 * before it would just be painted over, not pushed down. This follows the
 * same self-contained "fixed element + its own spacer" pattern instead, and
 * StoreHeader shifts its own fixed `top` offset down by this bar's height
 * (h-9) via the `hasAnnouncement` prop so the two stack correctly instead of
 * overlapping.
 */
export function AnnouncementBar({ announcements, freeShippingThreshold }: AnnouncementBarProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const { icon: currencyIcon, loading: currencyLoading } = useUserCurrencyIcon();
  const currency = currencyLoading ? "৳" : currencyIcon || "৳";
  const reduceMotion = useReducedMotion();

  const manualLines = announcements.map((a) => a.trim()).filter(Boolean);
  const freeShippingText =
    freeShippingThreshold && freeShippingThreshold > 0
      ? `${t.product.freeDelivery} — ${t.product.ordersOver} ${currency}${n(freeShippingThreshold)}`
      : null;

  const messages = [...manualLines, ...(freeShippingText ? [freeShippingText] : [])];
  const hasContent = messages.length > 0;
  const contentKey = messages.join("|");

  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [lapWidth, setLapWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    const containerEl = containerRef.current;
    const textEl = measureRef.current;
    if (!containerEl || !textEl || !hasContent) {
      setLapWidth(0);
      setContainerWidth(0);
      return;
    }

    const measure = () => {
      setLapWidth(textEl.getBoundingClientRect().width + MARQUEE_GAP_PX);
      setContainerWidth(containerEl.getBoundingClientRect().width);
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(containerEl);
    ro.observe(textEl);
    return () => ro.disconnect();
  }, [contentKey, hasContent]);

  if (!hasContent) return null;

  const shouldMarquee = !reduceMotion && lapWidth > 0;
  // Enough laps to cover the visible bar plus one full extra lap, so the
  // strip never runs out of text mid-loop regardless of how short the
  // combined line is relative to how wide the screen is.
  const repeatCount = shouldMarquee ? Math.max(2, Math.ceil(containerWidth / lapWidth) + 1) : 1;

  return (
    <>
      <div className="fixed top-0 left-0 w-full z-60 bg-header text-header-foreground text-xs sm:text-[13px] font-semibold tracking-wide">
        <div className="max-w-7xl mx-auto px-4 h-9 flex items-center gap-2 sm:gap-2.5">
          <span className="flex h-5 w-5 sm:h-5.5 sm:w-5.5 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0">
            <Megaphone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </span>

          <div
            ref={containerRef}
            className="relative flex-1 min-w-0 h-full flex items-center overflow-hidden"
            style={{
              WebkitMaskImage: `linear-gradient(to right, transparent, black ${EDGE_FADE_PX}px, black calc(100% - ${EDGE_FADE_PX}px), transparent)`,
              maskImage: `linear-gradient(to right, transparent, black ${EDGE_FADE_PX}px, black calc(100% - ${EDGE_FADE_PX}px), transparent)`,
            }}
          >
            {/* Off-screen, always mounted — measures a single lap's rendered
                width so the marquee's lap distance, speed, and repeat count
                all stay correct regardless of which branch below is shown. */}
            <span ref={measureRef} className="absolute invisible whitespace-nowrap pointer-events-none">
              <AnnouncementLap messages={messages} />
            </span>

            {shouldMarquee ? (
              <m.div
                className="flex whitespace-nowrap"
                animate={{ x: [0, -lapWidth] }}
                transition={{ duration: lapWidth / MARQUEE_PX_PER_SEC, ease: "linear", repeat: Infinity }}
              >
                {Array.from({ length: repeatCount }, (_, i) => (
                  <span key={i} aria-hidden={i > 0 || undefined} style={{ paddingRight: MARQUEE_GAP_PX }}>
                    <AnnouncementLap messages={messages} />
                  </span>
                ))}
              </m.div>
            ) : (
              <span className="w-full text-center truncate">
                <AnnouncementLap messages={messages} />
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="h-9" />
    </>
  );
}
