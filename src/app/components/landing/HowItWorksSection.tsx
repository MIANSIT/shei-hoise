"use client";

import { motion } from "framer-motion";

export default function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      title: "Sign Up & Create Store",
      description: "Register and get your personalized store URL: shei-hoise/your-store-name",
    },
    {
      step: "02",
      title: "Add Your Products",
      description: "Upload products, set prices, and manage inventory with bulk updates",
    },
    {
      step: "03",
      title: "Start Selling",
      description: "Share your store link with customers and start accepting orders with COD",
    },
  ];

  return (
    <section className="py-16 md:py-20 px-6">
      <div className="container mx-auto text-center mb-12 md:mb-16">
        <motion.h2 initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-3xl md:text-4xl font-bold mb-4">
          How Shei-Hoise Works
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Get your personalized store up and running in just a few simple steps
        </motion.p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {steps.map((step, index) => (
          <motion.div key={step.step} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: index * 0.2 }} className="text-center">
            <div className="w-16 h-16 bg-chart-2 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
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
