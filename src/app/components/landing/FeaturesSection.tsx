"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  GitBranch,
  Wallet,
  Package,
  Users,
} from "lucide-react";

export default function FeaturesSection() {
  const features = [
    {
      icon: BarChart3,
      title: "Profit & Loss Tracking",
      description:
        "See your revenue, expenses, and net profit updated daily. Know exactly where your business stands with 30-day comparisons.",
      color: "text-chart-2",
    },
    {
      icon: Bell,
      title: "Smart Business Alerts",
      description:
        "Get instant alerts for out-of-stock products, low inventory, and pending payments. Fix issues before they cost you sales.",
      color: "text-chart-5",
    },
    {
      icon: GitBranch,
      title: "Full Order Pipeline",
      description:
        "Track every order from Pending through Confirmed, Shipped, and Delivered. Full lifecycle visibility in one clean view.",
      color: "text-chart-3",
    },
    {
      icon: Wallet,
      title: "Payment Flow Overview",
      description:
        "Monitor collected, awaiting, and returned payments at a glance. Always know exactly what money is moving and when.",
      color: "text-chart-4",
    },
    {
      icon: Package,
      title: "Inventory Health",
      description:
        "Real-time stock levels across all products, with low-stock warnings, out-of-stock flags, and total inventory sell value.",
      color: "text-chart-1",
    },
    {
      icon: Users,
      title: "Customer Insights",
      description:
        "Track new vs. returning customers, measure your return rate, and identify your top spenders to grow smarter.",
      color: "text-chart-2",
    },
  ];

  return (
    <section id="features" className="py-16 md:py-20 px-6 bg-muted/30">
      <div className="container mx-auto text-center mb-12 md:mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold mb-4"
        >
          A Real Business Dashboard, Not Just a Store
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          Shei Hoise gives you the financial visibility and operational control
          that serious store owners actually need.
        </motion.p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="bg-card p-6 rounded-xl shadow-lg border hover:shadow-xl transition-all"
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
          </motion.div>
        ))}
      </div>
    </section>
  );
}
