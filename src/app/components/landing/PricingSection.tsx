"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function PricingSection() {
  const pricingPlans = [
    {
      name: "Starter",
      price: "$499",
      period: "/month",
      description: "Perfect for small businesses getting started",
      features: ["Up to 100 products", "Basic inventory management", "Customer order management", "Cash on Delivery payments", "Email support"],
      highlighted: false,
    },
    {
      name: "Growth",
      price: "$999",
      period: "/month",
      description: "Everything you need to grow your business",
      features: ["Up to 1000 products", "Advanced inventory management", "Bulk stock updates", "Order tracking system", "Priority support", "Sales analytics"],
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "$1,999",
      period: "/month",
      description: "For established businesses with high volume",
      features: ["Unlimited products", "Advanced analytics dashboard", "Custom domain support", "Dedicated account manager", "API access", "Custom integrations"],
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-16 md:py-20 px-6 bg-muted/30">
      <div className="container mx-auto text-center mb-12 md:mb-16">
        <motion.h2 initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-3xl md:text-4xl font-bold mb-4">
          Simple, Transparent Pricing
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Start free for 14 days. No credit card required. Choose the plan that fits your business needs.
        </motion.p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
        {pricingPlans.map((plan, index) => (
          <motion.div key={plan.name} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: index * 0.1 }} whileHover={{ scale: 1.02 }}
            className={`relative rounded-2xl p-6 md:p-8 ${plan.highlighted ? "bg-chart-2 text-white shadow-2xl border-0" : "bg-card border shadow-lg"}`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 md:-top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-chart-3 text-white px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-medium">Most Popular</span>
              </div>
            )}
            <h3 className={`text-xl md:text-2xl font-bold mb-2 ${plan.highlighted ? "text-white" : ""}`}>{plan.name}</h3>
            <p className={`mb-4 md:mb-6 text-sm md:text-base ${plan.highlighted ? "text-white/80" : "text-muted-foreground"}`}>{plan.description}</p>
            <div className="mb-4 md:mb-6">
              <span className="text-3xl md:text-4xl font-bold">{plan.price}</span>
              <span className={plan.highlighted ? "text-white/80" : "text-muted-foreground"}>{plan.period}</span>
            </div>
            <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 md:gap-3">
                  <CheckCircle className={`w-4 h-4 md:w-5 md:h-5 mt-0.5 flex-shrink-0 ${plan.highlighted ? "text-white" : "text-chart-2"}`} />
                  <span className={`text-sm md:text-base ${plan.highlighted ? "text-white/90" : ""}`}>{feature}</span>
                </li>
              ))}
            </ul>
            <Button className={`w-full ${plan.highlighted ? "bg-white text-chart-2 hover:bg-white/90" : "bg-chart-2 hover:bg-chart-2/90 text-white"}`} size="lg">Get Started</Button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
