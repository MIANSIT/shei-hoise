"use client";

import { Sparkles } from "lucide-react";
import PricingCard from "@/app/components/landing/PriceTag/PricingCard";

export default function PricingSection() {
  const features = [
    "Store Home Page (sheihoise.com/your-store)",
    "Full Ecommerce Platform",
    "Smart Order Link (1-Click Order)",
    "Admin Dashboard & Control Panel",
    "Product & Inventory Management",
    "Expense Management",
    "Customer Management",
    "Full Finance & Analytics Reports",
    "Auto Invoice Generation",
    "24/7 Support",
  ];

  const plans = [
    {
      name: "Founders Monthly",
      months: 1,
      price: 199,
      originalPrice: 0,
      description: "Start your online store with zero long-term commitment",
      highlighted: false,
      badge: null,
    },
    {
      name: "Founders 6M",
      months: 6,
      price: 999,
      originalPrice: 1194,
      description: "Grow your business — save 16% vs monthly",
      highlighted: true,
      badge: "Most Popular",
    },
    {
      name: "Founders 12M",
      months: 12,
      price: 1799,
      originalPrice: 2388,
      description: "Maximum savings for serious sellers — save 25%",
      highlighted: false,
      badge: "Best Value",
    },
  ];

  return (
    <section id="pricing" className="py-16 md:py-20 px-6 bg-muted/30">
      <div className="container mx-auto text-center mb-12 md:mb-16">
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 bg-linear-to-r from-green-600 to-emerald-500 text-white px-5 py-2.5 rounded-full shadow-lg">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="font-semibold text-sm md:text-base">
              Limited Offer for Eid Ul Azha — Founders Pricing
            </span>
            <Sparkles className="w-4 h-4 shrink-0" />
          </div>
        </div>

        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Shei-Hoise Founders Plans
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Lock in exclusive founders pricing before this offer ends. Start your
          Shei-Hoise store today and scale effortlessly.
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
