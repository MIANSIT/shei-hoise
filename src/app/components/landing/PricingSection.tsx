"use client";

import { Sparkles } from "lucide-react";
import PricingCard from "@/app/components/landing/PriceTag/PricingCard";
import { useTranslation } from "@/lib/hook/useTranslation";

export default function PricingSection() {
  const t = useTranslation();

  const features = [
    t.landing.pricingFeature1,
    t.landing.pricingFeature2,
    t.landing.pricingFeature3,
    t.landing.pricingFeature4,
    t.landing.pricingFeature5,
    t.landing.pricingFeature6,
    t.landing.pricingFeature7,
    t.landing.pricingFeature8,
    t.landing.pricingFeature9,
    t.landing.pricingFeature10,
  ];

  const plans = [
    {
      name: t.landing.plan1Name,
      months: 1,
      price: 199,
      originalPrice: 0,
      description: t.landing.plan1Desc,
      highlighted: false,
      badge: null,
    },
    {
      name: t.landing.plan2Name,
      months: 6,
      price: 999,
      originalPrice: 1194,
      description: t.landing.plan2Desc,
      highlighted: true,
      badge: t.landing.mostPopular,
    },
    {
      name: t.landing.plan3Name,
      months: 12,
      price: 1799,
      originalPrice: 2388,
      description: t.landing.plan3Desc,
      highlighted: false,
      badge: t.landing.bestValue,
    },
  ];

  return (
    <section id="pricing" className="py-16 md:py-20 px-6 bg-muted/30">
      <div className="container mx-auto text-center mb-12 md:mb-16">
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 bg-linear-to-r from-green-600 to-emerald-500 text-white px-5 py-2.5 rounded-full shadow-lg">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="font-semibold text-sm md:text-base">
              {t.landing.limitedOffer}
            </span>
            <Sparkles className="w-4 h-4 shrink-0" />
          </div>
        </div>

        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          {t.landing.pricingTitle}
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          {t.landing.pricingSubtitle}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <PricingCard
            key={plan.name}
            name={plan.name}
            description={plan.description}
            features={features}
            months={plan.months}
            originalPrice={plan.originalPrice}
            discountedPrice={plan.price}
            highlighted={plan.highlighted}
            badge={plan.badge}
          />
        ))}
      </div>
    </section>
  );
}
