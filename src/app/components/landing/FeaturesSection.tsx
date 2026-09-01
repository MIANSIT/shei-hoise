"use client";

import {
  BarChart3,
  Bell,
  GitBranch,
  Wallet,
  Package,
  Users,
} from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useGsapScope } from "@/lib/gsap/useGsapScope";

export default function FeaturesSection() {
  const t = useTranslation();

  const features = [
    { icon: BarChart3, title: t.landing.feature1Title, description: t.landing.feature1Desc, color: "text-chart-2" },
    { icon: Bell,     title: t.landing.feature2Title, description: t.landing.feature2Desc, color: "text-chart-5" },
    { icon: GitBranch,title: t.landing.feature3Title, description: t.landing.feature3Desc, color: "text-chart-3" },
    { icon: Wallet,   title: t.landing.feature4Title, description: t.landing.feature4Desc, color: "text-chart-4" },
    { icon: Package,  title: t.landing.feature5Title, description: t.landing.feature5Desc, color: "text-chart-1" },
    { icon: Users,    title: t.landing.feature6Title, description: t.landing.feature6Desc, color: "text-chart-2" },
  ];

  // Scroll reveal, GSAP rather than per-element whileInView: one trigger for
  // the whole section keeps the cards on a single stagger, so they read as one
  // system arriving instead of six independent fades racing each other.
  const scope = useGsapScope(({ q, root, reduced, gsap }) => {
    const targets = [...q("[data-reveal]"), ...q("[data-reveal-card]")];

    if (reduced) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return;
    }

    gsap.set(targets, { opacity: 0, y: 28 });

    gsap.timeline({
      scrollTrigger: {
        trigger: root,
        // Fires when the section is a third of the way up the viewport —
        // late enough that the reader is looking at it, early enough that
        // nothing has finished animating before it is on screen.
        start: "top 70%",
        once: true,
      },
      defaults: { ease: "power3.out" },
    })
      .to(q("[data-reveal]"), { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 })
      .to(
        q("[data-reveal-card]"),
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.07 },
        "-=0.35",
      );
  });

  return (
    <section
      ref={scope as React.RefObject<HTMLElement>}
      id="features"
      className="py-16 md:py-20 px-6 bg-muted/30"
    >
      <div className="container mx-auto text-center mb-12 md:mb-16">
        <h2 data-reveal className="text-3xl md:text-4xl font-bold mb-4">
          {t.landing.featuresTitle}
        </h2>
        <p
          data-reveal
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          {t.landing.featuresSubtitle}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {features.map((feature) => (
          <div
            key={feature.title}
            data-reveal-card
            className="bg-card p-6 rounded-xl shadow-lg border transition-transform duration-200 hover:-translate-y-1.5 hover:shadow-xl"
          >
            <div
              className={`w-10 h-10 md:w-12 md:h-12 ${feature.color} bg-muted rounded-lg flex items-center justify-center mb-4`}
            >
              <feature.icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold mb-3">
              {feature.title}
            </h3>
            <p className="text-sm md:text-base text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
