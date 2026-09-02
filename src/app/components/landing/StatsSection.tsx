"use client";

import { Store, ShoppingCart, Package } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLanguageStore } from "@/lib/store/languageStore";
import { useGsapScope } from "@/lib/gsap/useGsapScope";

/**
 * Scale, read off a rail as the page scrolls.
 *
 * The three figures sit on one connecting line rather than in three separate
 * cards. That is the point of the layout: stores, then the orders those stores
 * put through, then the catalogue behind those orders — one sentence about the
 * platform, read left to right, instead of three unrelated boasts.
 *
 * The line draws with scroll and each node lights and counts as the line
 * reaches it, so the figures arrive in that order under the reader's own
 * control. Scroll back and it runs backwards; the readout is bound to
 * position, not to a timer that fired once.
 *
 * Three things this does that the earlier card grid did not:
 *
 * - **Each figure keeps its "so what" line.** A bare "10k+" tells a merchant
 *   nothing about their decision. The caption is the reason, the number is
 *   only the evidence.
 * - **The rail turns vertical on mobile.** Three nodes crammed onto a phone
 *   width is unreadable, and a horizontal rail there would be decoration.
 * - **Numbers are staggered across the scroll window** rather than counting in
 *   unison, so the eye has somewhere to go and the sequence reads as a
 *   sequence.
 */
export default function StatsSection() {
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);

  // Icons deliberately match the dashboard's own vocabulary (see lib/menu.ts):
  // ShoppingCart is Orders, Package is Products, Store is the shop itself. The
  // previous pair was actively misleading — Package is what this app uses for
  // products, and Boxes is what it uses for bundles, so using them for orders
  // and products taught a merchant the wrong icons before they ever signed up.
  const stats = [
    {
      icon: Store,
      value: t.landing.stat1Value,
      label: t.landing.stat1Label,
      caption: t.landing.statStoresCaption,
    },
    {
      icon: ShoppingCart,
      value: t.landing.stat2Value,
      label: t.landing.stat2Label,
      caption: t.landing.statOrdersCaption,
    },
    {
      icon: Package,
      value: t.landing.statProductsValue,
      label: t.landing.statProductsLabel,
      caption: t.landing.statProductsCaption,
    },
  ];

  const scope = useGsapScope(({ q, root, reduced, gsap }) => {
    const figures = q("[data-stat-figure]") as HTMLElement[];
    const nodes = q("[data-stat-node]") as HTMLElement[];
    const cards = q("[data-stat-card]");
    const heading = q("[data-stat-head]");
    const railFills = q("[data-rail-fill]");

    // Parsed once. Prefix and suffix are preserved verbatim so "10k+" animates
    // its 10 and keeps the rest, and Bengali numerals — which do not parse as
    // Latin digits — fall through to their authored string untouched.
    const parsed = figures.map((el) => {
      const raw = el.dataset.statFigure ?? el.textContent ?? "";
      const match = raw.match(/^([^\d]*)([\d,.]+)(.*)$/);
      if (!match) {
        return { el, raw, target: null as number | null, prefix: "", suffix: "", grouped: false };
      }
      const [, prefix, digits, suffix] = match;
      const target = Number(digits.replace(/,/g, ""));
      return {
        el,
        raw,
        target: Number.isFinite(target) ? target : null,
        prefix,
        suffix,
        grouped: digits.includes(","),
      };
    });

    const settle = () => {
      parsed.forEach(({ el, raw }) => {
        el.textContent = raw;
      });
      nodes.forEach((node) => node.setAttribute("data-lit", "true"));
    };

    if (reduced) {
      gsap.set([...cards, ...heading], { opacity: 1, y: 0 });
      gsap.set(railFills, { scaleX: 1, scaleY: 1 });
      settle();
      return;
    }

    gsap.set(cards, { opacity: 0, y: 24 });
    gsap.set(heading, { opacity: 0, y: 20 });
    gsap.set(q("[data-rail-fill='horizontal']"), { scaleX: 0, transformOrigin: "left center" });
    gsap.set(q("[data-rail-fill='vertical']"), { scaleY: 0, transformOrigin: "center top" });

    const reveal = { trigger: root, start: "top 78%", once: true } as const;

    gsap.to(heading, {
      opacity: 1,
      y: 0,
      duration: 0.55,
      stagger: 0.08,
      ease: "power3.out",
      scrollTrigger: reveal,
    });

    // The cards arrive on a plain reveal — only the rail and the digits are
    // scrubbed, so a reader who stops mid-section still sees whole, readable
    // cards rather than half-drawn ones.
    gsap.to(cards, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.08,
      ease: "power3.out",
      scrollTrigger: reveal,
    });

    const progress = { value: 0 };
    gsap.to(progress, {
      value: 1,
      ease: "none",
      scrollTrigger: {
        trigger: root,
        start: "top 80%",
        // Completes while the section is still well inside the viewport. A
        // counter that finishes below the fold was never actually watched.
        end: "center 52%",
        scrub: 0.5,
      },
      onUpdate: () => {
        const p = progress.value;

        gsap.set(q("[data-rail-fill='horizontal']"), { scaleX: p });
        gsap.set(q("[data-rail-fill='vertical']"), { scaleY: p });

        parsed.forEach(({ el, raw, target, prefix, suffix, grouped }, i) => {
          if (target === null) {
            el.textContent = raw;
            return;
          }

          // Each figure owns a window of the scroll, overlapping slightly, so
          // they resolve in order as the line passes them instead of all
          // racing to the same finish.
          const start = i * 0.28;
          const local = gsap.utils.clamp(0, 1, (p - start) / 0.44);
          const current = Math.round(target * local);

          el.textContent =
            prefix +
            (grouped ? current.toLocaleString("en-US") : String(current)) +
            suffix;

          const node = nodes[i];
          if (node) node.setAttribute("data-lit", local > 0.05 ? "true" : "false");
        });
      },
    });
    // The figures are parsed once per setup and written back on scroll, so a
    // language switch has to re-parse — otherwise scrolling would repaint the
    // previous language's numbers over React's freshly rendered ones.
  }, [lang]);

  return (
    <section
      ref={scope as React.RefObject<HTMLElement>}
      className="border-y border-chart-2/10 bg-muted/20 px-6 py-16 md:py-20"
    >
      <div className="container mx-auto max-w-5xl">
        <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
          <span
            data-stat-head
            className="text-xs font-bold uppercase tracking-widest text-chart-2"
          >
            {t.landing.statsEyebrow}
          </span>
          <h2 data-stat-head className="mt-3 text-3xl font-bold md:text-4xl">
            {t.landing.statsTitle}
          </h2>
          <p data-stat-head className="mt-3 text-lg text-muted-foreground">
            {t.landing.statsSubtitle}
          </p>
        </div>

        {/* Readout panel — deliberately instrument-like, since what it is
            showing is a dashboard product's own numbers. */}
        <div className="rounded-2xl border bg-card p-6 shadow-lg md:p-10">
          <div className="mb-8 flex items-center justify-between gap-4 border-b pb-4 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            <span>{t.landing.statsRailLabel}</span>
            <span className="tabular-nums">{t.landing.statsAsOf}</span>
          </div>

          <div className="relative">
            {/* Horizontal rail — desktop. Inset to the centre of the first and
                last node so the line spans node to node, not edge to edge. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-[14px] hidden h-px bg-border md:block"
            >
              <div
                data-rail-fill="horizontal"
                className="h-full w-full bg-chart-2"
              />
            </div>

            {/* Vertical rail — mobile, where three nodes across a phone would
                be unreadable. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-10 left-4 top-3 w-px bg-border md:hidden"
            >
              <div
                data-rail-fill="vertical"
                className="h-full w-full bg-chart-2"
              />
            </div>

            <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
              {stats.map(({ icon: Icon, value, label, caption }) => (
                <li
                  key={label}
                  data-stat-card
                  className="relative pl-12 text-left md:pl-0 md:text-center"
                >
                  {/* The node itself: the point on the rail this figure sits
                      at. Lights as the line reaches it. */}
                  <span
                    data-stat-node
                    data-lit="false"
                    aria-hidden="true"
                    className="group absolute left-0.5 top-1 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-card transition-colors duration-300 data-[lit=true]:border-chart-2 md:left-1/2 md:top-0 md:-translate-x-1/2"
                  >
                    {/* The lit tint is a layer *inside* the node rather than a
                        translucent background on it. The node's own background
                        has to stay opaque, otherwise the rail behind it shows
                        straight through the circle and draws a line across the
                        icon. */}
                    <span className="absolute inset-0 rounded-full bg-chart-2/10 opacity-0 transition-opacity duration-300 group-data-[lit=true]:opacity-100" />
                    <Icon className="relative h-3.5 w-3.5 text-muted-foreground transition-colors duration-300 group-data-[lit=true]:text-chart-2" />
                  </span>

                  <div className="md:pt-11">
                    <p
                      className="text-4xl font-bold tabular-nums leading-none text-chart-2 md:text-5xl"
                      aria-label={`${value} ${label}`}
                    >
                      <span data-stat-figure={value} aria-hidden="true">
                        {value}
                      </span>
                    </p>
                    <p className="mt-2 font-semibold text-foreground">{label}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:mx-auto md:max-w-[26ch]">
                      {caption}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
