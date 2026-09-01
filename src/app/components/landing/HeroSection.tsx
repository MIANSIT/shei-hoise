"use client";

import { Fragment } from "react";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useGsapScope, countUpTo } from "@/lib/gsap/useGsapScope";
import { useLanguageStore } from "@/lib/store/languageStore";

// `m.create()` rather than `motion(Button)`: under LazyMotion strict the
// `motion` factory is unavailable by design — see MotionProvider.
const MotionButton = m.create(Button);

const salesBars = [2, 4, 3, 6, 8, 5, 3, 4, 7, 9, 6, 8, 5, 4, 6, 7];

export default function HeroSection() {
  const router = useRouter();
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);

  /**
   * Splits a headline into per-word spans for the entrance stagger.
   *
   * Done in JSX rather than with GSAP's SplitText on purpose. SplitText
   * rewrites the element's children in the DOM, which takes that subtree out
   * of React's hands — so switching language left the old words on screen,
   * because React was updating text nodes SplitText had already replaced.
   * Rendering the words ourselves keeps React the owner and the animation
   * only touches their transforms.
   */
  const words = (text: string) => {
    const parts = text.split(" ");
    return parts.map((word, index) => (
      // The separator is a real text node outside the span, not a non-breaking
      // space inside it — an nbsp would stop the headline wrapping on a phone.
      <Fragment key={`${word}-${index}`}>
        <span data-hero-word className="inline-block">
          {word}
        </span>
        {index < parts.length - 1 ? " " : ""}
      </Fragment>
    ));
  };

  const pnl = [
    { label: t.landing.pnlRevenue, value: "৳6,801", color: "text-chart-2", border: "border-t-chart-2" },
    { label: t.landing.pnlExpenses, value: "৳100", color: "text-chart-5", border: "border-t-chart-5" },
    { label: t.landing.pnlNetProfit, value: "৳647", color: "text-chart-2", border: "border-t-chart-2" },
  ];

  const pipeline = [
    { label: t.landing.pipelineDelivered, count: 13, dot: "bg-chart-2", text: "text-chart-2" },
    { label: t.landing.pipelineShipped, count: 1, dot: "bg-chart-3", text: "text-chart-3" },
    { label: t.landing.pipelinePending, count: 0, dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
    { label: t.landing.pipelineCancelled, count: 0, dot: "bg-chart-5/50", text: "text-muted-foreground" },
  ];

  // The hero is the only thing a first-time visitor is guaranteed to see, and
  // previously every part of it arrived at once — headline, mock, CTA and
  // stats all competing for the same glance. This gives that half-second an
  // order of reading: sentence first, then the product doing something, then
  // the ask. One timeline rather than a dozen delays, so the offsets stay
  // adjustable as a unit.
  const scope = useGsapScope(({ q, reduced, gsap }) => {
    const reveal = q("[data-hero]");
    const mock = q("[data-hero-mock]");
    const bars = q("[data-hero-bar]");
    const counters = q("[data-count]") as HTMLElement[];

    if (reduced) {
      gsap.set([...reveal, ...mock, ...q("[data-hero-word]")], {
        opacity: 1,
        y: 0,
        clearProps: "transform",
      });
      gsap.set(bars, { scaleY: 1 });
      counters.forEach((el) => {
        el.textContent = el.dataset.count ?? el.textContent;
      });
      return;
    }

    // Word-level stagger so the eye tracks left to right and lands on the
    // emphasised half, rather than absorbing the whole block at once.
    const headlineWords = q("[data-hero-word]");

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      // Runs after first paint: the headline is the LCP element and must not
      // sit at opacity 0 waiting on JS.
      delay: 0.05,
    });

    tl.from(q("[data-hero='badge']"), { y: 12, opacity: 0, duration: 0.45 });

    if (headlineWords.length > 0) {
      tl.from(
        headlineWords,
        { y: "0.6em", opacity: 0, duration: 0.6, stagger: 0.04 },
        "-=0.25",
      );
    }

    tl.from(q("[data-hero='sub']"), { y: 14, opacity: 0, duration: 0.5 }, "-=0.35")
      // The mock overlaps the copy rather than following it — the product
      // picture should read as the consequence of the sentence, not a
      // separate beat.
      .from(
        mock,
        { y: 28, opacity: 0, scale: 0.985, duration: 0.7, transformOrigin: "center top" },
        "-=0.55",
      )
      .from(
        bars,
        { scaleY: 0, transformOrigin: "bottom", duration: 0.5, stagger: 0.025 },
        "-=0.3",
      )
      .from(q("[data-hero='cta']"), { y: 14, opacity: 0, duration: 0.5 }, "-=0.45")
      .from(q("[data-hero='trust']"), { y: 10, opacity: 0, duration: 0.45 }, "-=0.35")
      .from(q("[data-hero='stats']"), { y: 10, opacity: 0, duration: 0.45 }, "-=0.3")
      .add(() => {
        counters.forEach((el) =>
          countUpTo(el, el.dataset.count ?? "", { duration: 1.1 }),
        );
      }, "-=0.2");
    // Re-runs on language change: the word count differs between English and
    // Bangla, so the timeline has to be rebuilt against the new spans.
  }, [lang]);

  const stats = [
    { value: t.landing.stat1Value, label: t.landing.stat1Label },
    { value: t.landing.stat2Value, label: t.landing.stat2Label },
    { value: t.landing.stat3Value, label: t.landing.stat3Label },
  ];

  const trustBadges = [t.landing.trust1, t.landing.trust2, t.landing.trust3];

  return (
    <>
      <section
        ref={scope as React.RefObject<HTMLElement>}
        className="pt-10 md:pt-20 pb-16 px-3"
      >
        <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">

          {/* LEFT — Copy */}
          <div className="space-y-8">
            {/* BADGE */}
            <div data-hero="badge">
              <span className="inline-flex items-center gap-2 bg-chart-2/10 text-chart-2 text-xs font-semibold px-4 py-1.5 rounded-full border border-chart-2/20">
                <Zap className="w-3 h-3" />
                {t.landing.badge}
              </span>
            </div>

            {/* HEADLINE */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              {words(t.landing.headline1)}
              <br />
              <span className="text-chart-2">{words(t.landing.headline2)}</span>
            </h1>

            {/* SUBTEXT */}
            <p
              data-hero="sub"
              className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg"
            >
              {t.landing.subtext}
            </p>

            {/* CTA BUTTONS */}
            <div data-hero="cta" className="flex flex-col sm:flex-row gap-4">
              <MotionButton
                size="lg"
                className="w-full sm:w-auto bg-chart-2 hover:bg-chart-2/90 text-background px-8 py-4 text-base sm:text-lg flex items-center justify-center"
                whileTap={{ scale: 0.96 }}
                onClick={() => router.push("/onboarding")}
              >
                {t.landing.startFree}
                <ArrowRight className="ml-2 hidden sm:block w-5 h-5" />
              </MotionButton>

              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-8 py-4 text-base sm:text-lg"
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                {t.landing.seeHowItWorks}
              </Button>
            </div>

            {/* TRUST BADGES */}
            <div
              data-hero="trust"
              className="flex flex-wrap gap-4 text-sm text-muted-foreground"
            >
              {trustBadges.map((text, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-chart-2" />
                  {text}
                </div>
              ))}
            </div>

            {/* STATS */}
            <div data-hero="stats" className="flex gap-8 pt-4 border-t border-border">
              {stats.map((stat) => (
                <div key={stat.label}>
                  {/* data-count holds the authored string ("500+", "10k+") —
                      the counter animates only its numeric part so the copy
                      stays the source of truth. */}
                  <p
                    className="text-2xl font-bold text-chart-2"
                    data-count={stat.value}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Professional Dashboard Mockup */}
          <div data-hero-mock className="relative">
            {/* Ambient glow */}
            <div className="absolute -inset-4 bg-linear-to-br from-chart-2/20 via-chart-3/10 to-transparent rounded-3xl blur-2xl pointer-events-none" />

            {/* App window frame */}
            <div className="relative rounded-2xl border shadow-2xl bg-card overflow-hidden">

              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b">
                <span className="w-2.5 h-2.5 rounded-full bg-chart-5/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-chart-3/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-chart-2/80" />
                <div className="ml-2 flex-1 bg-background/70 rounded px-3 py-0.5 border border-border/50">
                  <p className="text-[10px] text-muted-foreground">
                    shei-hoise.com/dashboard
                  </p>
                </div>
              </div>

              {/* App layout: sidebar + content */}
              <div className="flex">

                {/* Minimal sidebar — hidden on mobile */}
                <div className="hidden lg:flex w-9 bg-muted/20 border-r flex-col items-center pt-3 pb-3 gap-2.5">
                  <div className="w-4 h-4 bg-chart-2/30 rounded-sm" />
                  <div className="w-4 h-px bg-border" />
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-4 h-4 bg-muted-foreground/10 rounded-sm" />
                  ))}
                </div>

                {/* Dashboard content */}
                <div className="flex-1 p-3 space-y-3 min-w-0">

                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold leading-tight">{t.landing.dashboardHeader}</p>
                      <p className="text-[9px] text-muted-foreground">Mon, Apr 27, 2026</p>
                    </div>
                    <div className="flex gap-1">
                      {["7D", "30D", "1Y"].map((d) => (
                        <span
                          key={d}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                            d === "30D"
                              ? "bg-chart-2 text-background"
                              : "text-muted-foreground"
                          }`}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Alert banner */}
                  <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-700/30 rounded px-2 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <p className="text-[9px] text-amber-700 dark:text-amber-400 font-medium truncate">
                      {t.landing.dashboardAlert}
                    </p>
                  </div>

                  {/* P&L Snapshot */}
                  <div>
                    <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-widest mb-1.5">
                      {t.landing.pnlTitle}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {pnl.map((item) => (
                        <div
                          key={item.label}
                          className={`bg-muted rounded p-2 text-center border-t-2 ${item.border}`}
                        >
                          <p className={`text-[11px] font-bold ${item.color}`}>
                            {item.value}
                          </p>
                          <p className="text-[8px] text-muted-foreground mt-0.5">
                            {item.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Pipeline */}
                  <div>
                    <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-widest mb-1.5">
                      {t.landing.pipelineTitle}
                    </p>
                    <div className="space-y-1">
                      {pipeline.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between bg-muted/60 rounded px-2 py-1"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`} />
                            <span className="text-[10px]">{item.label}</span>
                          </div>
                          <span className={`text-[10px] font-bold ${item.text}`}>
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Flow */}
                  <div>
                    <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-widest mb-1.5">
                      {t.landing.paymentTitle}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-chart-2/10 rounded p-2">
                        <p className="text-[11px] font-bold text-chart-2">৳8,650</p>
                        <p className="text-[8px] text-muted-foreground">{t.landing.paymentCollected}</p>
                      </div>
                      <div className="bg-chart-3/10 rounded p-2">
                        <p className="text-[11px] font-bold text-chart-3">৳430</p>
                        <p className="text-[8px] text-muted-foreground">{t.landing.paymentAwaiting}</p>
                      </div>
                    </div>
                  </div>

                  {/* Sales Trend */}
                  <div>
                    <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-widest mb-1.5">
                      {t.landing.salesTitle}
                    </p>
                    <div className="flex items-end gap-0.5 h-7">
                      {salesBars.map((h, i) => (
                        <div
                          key={i}
                          data-hero-bar
                          className={`flex-1 rounded-sm ${
                            i >= salesBars.length - 4
                              ? "bg-chart-2"
                              : "bg-muted-foreground/20"
                          }`}
                          style={{ height: `${(h / 9) * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* STICKY MOBILE CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
        <div className="bg-background border-t p-3">
          <MotionButton
            className="w-full bg-chart-2 text-background py-4 text-base"
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(34,197,94,0.6)",
                "0 0 0 14px rgba(34,197,94,0)",
              ],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push("/onboarding")}
          >
            {t.landing.startTrial}
          </MotionButton>
        </div>
      </div>
    </>
  );
}
