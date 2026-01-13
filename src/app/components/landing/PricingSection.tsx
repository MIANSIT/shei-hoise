"use client";

import PricingCard from "@/app/components/landing/PriceTag/PricingCard";

export default function PricingSection() {
  const monthlyPrice = 499; // actual monthly price
  const monthlyOriginalPrice = 699; // crossed-out original price
  const halfYearlyDiscount = 0.05; // 5% discount
  const yearlyDiscount = 0.1; // 10% discount

  const features = [
    "Manage products, orders & users",
    "Track orders live",
    "One-click customer orders",
    "Custom store: sheihoise.com/your-store",
    "Cash on Delivery & view sales reports",
  ];

  const plans = [
    {
      name: "Monthly",
      months: 1,
      description: "For individuals or small sellers starting their store",
      highlighted: false,
    },
    {
      name: "Half-Yearly",
      months: 6,
      description: "For growing businesses that need advanced tools",
      highlighted: true,
    },
    {
      name: "Yearly",
      months: 12,
      description:
        "For established businesses with high volume and custom needs",
      highlighted: false,
    },
  ];

  const calculatePrice = (months: number) => {
    // Original price = monthlyOriginalPrice × months
    const originalPrice = monthlyOriginalPrice * months;

    // Discounted price = monthlyPrice × months × (1 - discount)
    let discountedPrice = monthlyPrice * months;
    if (months === 6)
      discountedPrice = discountedPrice * (1 - halfYearlyDiscount);
    if (months === 12) discountedPrice = discountedPrice * (1 - yearlyDiscount);

    return { originalPrice, discountedPrice };
  };

  return (
    <section id="pricing" className="py-16 md:py-20 px-6 bg-muted/30">
      <div className="container mx-auto text-center mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Shei-Hoise Pricing Plans
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose a plan that fits your business. Start your Shei-Hoise store
          today and scale effortlessly.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const { originalPrice, discountedPrice } = calculatePrice(
            plan.months
          );
          return (
            <PricingCard
              key={plan.name}
              name={plan.name}
              description={plan.description}
              features={features}
              months={plan.months}
              originalPrice={originalPrice}
              discountedPrice={discountedPrice}
              highlighted={plan.highlighted}
            />
          );
        })}
      </div>
    </section>
  );
}
