"use client";

import { useTranslation } from "@/lib/hook/useTranslation";
import { useGsapScope } from "@/lib/gsap/useGsapScope";

export default function HowItWorksSection() {
  const t = useTranslation();

  // One emoji family — three commerce objects of similar visual weight, in the
  // order the merchant meets them: open the shop, stock it, sell from it.
  // Deliberately not faces or abstract symbols, which sit at a different
  // weight and would read as decoration rather than as the step's subject.
  const steps = [
    {
      emoji: "\u{1F3EA}",
      title: t.landing.step1Title,
      description: t.landing.step1Desc,
    },
    {
      emoji: "\u{1F4E6}",
      title: t.landing.step2Title,
      description: t.landing.step2Desc,
    },
    {
      emoji: "\u{1F6CD}\u{FE0F}",
      title: t.landing.step3Title,
      description: t.landing.step3Desc,
    },
  ];

  // These three are a real sequence, so the motion encodes the order: the
  // connecting line draws left to right and each step lands as the line
  // reaches it. Scrubbed against scroll rather than fired on entry — the
  // reader sets the pace, which is what makes it read as a process rather
  // than as three cards that happen to be animated.
  const scope = useGsapScope(({ q, root, reduced, gsap }) => {
    const cards = q("[data-step-card]");
    const line = q("[data-step-line]");
    const heading = q("[data-reveal]");

    if (reduced) {
      gsap.set([...cards, ...heading], { opacity: 1, y: 0, scale: 1 });
      gsap.set(line, { scaleX: 1 });
      return;
    }

    gsap.set(cards, { opacity: 0, y: 24, scale: 0.96 });
    gsap.set(line, { scaleX: 0, transformOrigin: "left center" });
    gsap.set(heading, { opacity: 0, y: 28 });

    gsap.to(heading, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: { trigger: root, start: "top 70%", once: true },
    });

    gsap
      .timeline({
        scrollTrigger: {
          trigger: q("[data-steps-grid]")[0],
          start: "top 78%",
          end: "bottom 65%",
          scrub: 0.6,
        },
        defaults: { ease: "none" },
      })
      .to(line, { scaleX: 1, duration: 3 }, 0)
      .to(cards[0], { opacity: 1, y: 0, scale: 1, duration: 0.8 }, 0)
      .to(cards[1], { opacity: 1, y: 0, scale: 1, duration: 0.8 }, 1)
      .to(cards[2], { opacity: 1, y: 0, scale: 1, duration: 0.8 }, 2);
  });

  return (
    <section
      ref={scope as React.RefObject<HTMLElement>}
      className="py-16 md:py-20 px-6"
    >
      <div className="container mx-auto text-center mb-12 md:mb-16">
        <h2 data-reveal className="text-3xl md:text-4xl font-bold mb-4">
          {t.landing.howTitle}
        </h2>
        <p
          data-reveal
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          {t.landing.howSubtitle}
        </p>
      </div>

      <div data-steps-grid className="relative max-w-4xl mx-auto">
        {/* The line the sequence is drawn along. Desktop only: stacked on
            mobile the three steps are already visibly ordered, and a
            horizontal rule behind them would just be noise. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[16.6%] right-[16.6%] top-8 hidden h-0.5 bg-chart-2/30 md:block"
        >
          <div data-step-line className="h-full w-full bg-chart-2" />
        </div>

        <div className="relative grid gap-8 md:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} data-step-card className="text-center">
            {/* The emoji replaces the step number visually, so the ordinal
                moves to screen-reader-only text — the sequence still has to be
                announced, and an emoji alone does not convey "first". The
                solid green fill is gone too: a multicolour glyph on a solid
                brand colour muddies both. */}
            <div className="relative z-1 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-chart-2/25 bg-card text-3xl leading-none shadow-sm ring-4 ring-chart-2/10">
              <span className="sr-only">
                {t.landing.stepCounterLabel} {index + 1}:
              </span>
              <span aria-hidden="true">{step.emoji}</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
            <p className="text-muted-foreground">{step.description}</p>
          </div>
        ))}
        </div>
      </div>
    </section>
  );
}
