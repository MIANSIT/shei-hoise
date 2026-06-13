"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/lib/hook/useTranslation";

export default function HowItWorksSection() {
  const t = useTranslation();

  const steps = [
    { step: "01", title: t.landing.step1Title, description: t.landing.step1Desc },
    { step: "02", title: t.landing.step2Title, description: t.landing.step2Desc },
    { step: "03", title: t.landing.step3Title, description: t.landing.step3Desc },
  ];

  return (
    <section className="py-16 md:py-20 px-6">
      <div className="container mx-auto text-center mb-12 md:mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold mb-4"
        >
          {t.landing.howTitle}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          {t.landing.howSubtitle}
        </motion.p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {steps.map((step, index) => (
          <motion.div
            key={step.step}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: index * 0.2 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-chart-2 text-background rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              {step.step}
            </div>
            <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
            <p className="text-muted-foreground">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
