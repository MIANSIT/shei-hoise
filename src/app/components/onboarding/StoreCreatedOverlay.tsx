"use client";

import { useGsapScope } from "@/lib/gsap/useGsapScope";
import { useTranslation } from "@/lib/hook/useTranslation";

interface StoreCreatedOverlayProps {
  storeName?: string;
  /** Called once the sequence finishes — the caller navigates from here. */
  onDone: () => void;
}

/**
 * The moment the merchant becomes a customer.
 *
 * Finishing onboarding previously got a toast and an immediate redirect, which
 * is the same acknowledgement a failed field validation gets. This holds for
 * roughly a second and a half and says the thing plainly: the store exists.
 * It is the cheapest goodwill in the product, and the last impression before
 * an empty dashboard.
 *
 * The delay is deliberate but bounded — `onDone` fires from the timeline, and
 * also from a hard timeout, so a merchant is never stranded here if an
 * animation is interrupted or the tab was backgrounded mid-sequence.
 */
export default function StoreCreatedOverlay({
  storeName,
  onDone,
}: StoreCreatedOverlayProps) {
  const t = useTranslation();

  const scope = useGsapScope(({ q, reduced, gsap }) => {
    const check = q("[data-check-path]")[0] as unknown as
      | SVGPathElement
      | undefined;

    if (reduced) {
      gsap.set(q("[data-success]"), { opacity: 1, y: 0, scale: 1 });
      if (check) gsap.set(check, { strokeDashoffset: 0 });
      const timeout = setTimeout(onDone, 900);
      return () => clearTimeout(timeout);
    }

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.from(q("[data-success='ring']"), {
      scale: 0.4,
      opacity: 0,
      duration: 0.45,
      ease: "back.out(1.7)",
    });

    if (check) {
      // Draw the tick rather than popping it in — the stroke resolving is what
      // makes it read as "done" instead of as an icon that was always there.
      const length = check.getTotalLength();
      gsap.set(check, { strokeDasharray: length, strokeDashoffset: length });
      tl.to(check, { strokeDashoffset: 0, duration: 0.45 }, "-=0.15");
    }

    tl.from(q("[data-success='title']"), { y: 14, opacity: 0, duration: 0.4 }, "-=0.2")
      .from(q("[data-success='sub']"), { y: 12, opacity: 0, duration: 0.4 }, "-=0.25")
      .to({}, { duration: 0.45 });

    tl.eventCallback("onComplete", onDone);

    // Belt and braces: GSAP pauses timelines in background tabs, so a merchant
    // who switches away mid-sequence would otherwise sit on this overlay.
    const fallback = setTimeout(onDone, 3000);
    return () => clearTimeout(fallback);
  });

  return (
    <div
      ref={scope as React.RefObject<HTMLDivElement>}
      role='status'
      aria-live='polite'
      className='fixed inset-0 z-100 flex flex-col items-center justify-center gap-5 bg-background/95 px-6 text-center backdrop-blur-sm'
    >
      <div
        data-success='ring'
        className='flex h-20 w-20 items-center justify-center rounded-full bg-chart-2/12 ring-1 ring-chart-2/30'
      >
        <svg width='40' height='40' viewBox='0 0 40 40' fill='none' aria-hidden='true'>
          <path
            data-check-path
            d='M11 20.5 L17.5 27 L29 15'
            stroke='var(--chart-2)'
            strokeWidth='3'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </div>

      <h2
        data-success='title'
        className='text-2xl font-bold tracking-tight text-foreground'
      >
        {storeName
          ? `${storeName} ${t.onboarding.successTitleSuffix}`
          : t.onboarding.successTitleFallback}
      </h2>

      <p data-success='sub' className='max-w-sm text-sm text-muted-foreground'>
        {t.onboarding.successSubtitle}
      </p>
    </div>
  );
}
