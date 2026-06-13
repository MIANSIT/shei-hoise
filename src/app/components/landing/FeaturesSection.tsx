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
import { useTranslation } from "@/lib/hook/useTranslation";

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

  return (
    <section id="features" className="py-16 md:py-20 px-6 bg-muted/30">
      <div className="container mx-auto text-center mb-12 md:mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold mb-4"
        >
          {t.landing.featuresTitle}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          {t.landing.featuresSubtitle}
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
