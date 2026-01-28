"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  BarChart3,
  Shield,
} from "lucide-react";
import ContactUSForm from "@/app/components/contactUs/ContactUsForm";
import Modal from "@/app/components//common/Modal"; // Import the modal component
import { useState } from "react";

export default function HeroSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const fadeInUp = {
    initial: { y: 60, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.6 },
  };
  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.1 } },
  };

  return (
    <section className="pt-20 md:pt-32 pb-20 px-6">
      <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          <motion.h1
            variants={fadeInUp}
            className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
          >
            Transform Your{" "}
            <span className="text-chart-2">Store Management</span> Experience
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            className="text-lg md:text-xl text-muted-foreground mt-6 mb-8 leading-relaxed"
          >
            Shei-Hoise empowers store owners with seamless inventory management,
            customer orders, and real-time tracking. Start your personalized
            store at{" "}
            <span className="font-semibold text-foreground">
              shei-hoise.com/your-store-name
            </span>{" "}
            today!
          </motion.p>
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button
              size="lg"
              className="bg-chart-2 hover:bg-chart-2/90 text-background px-6 md:px-8 py-3 text-base md:text-lg"
              onClick={openModal}
            >
              Request Demo <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
            <Modal isOpen={isModalOpen} onClose={closeModal}>
              <ContactUSForm
                source="demo_request"
                title="Request for Your Free Demo"
                subtitle="Fill out the form and one of our specialists will reach out to you shortly."
                buttonText="Demo Request"
              />
            </Modal>
            <Button
              variant="outline"
              size="lg"
              className="px-6 md:px-8 py-3 text-base md:text-lg"
              onClick={() =>
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explore Features
            </Button>
          </motion.div>
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mt-8 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-chart-2" /> No credit card
              required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-chart-2" /> Setup in 5
              minutes
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-chart-2" /> Free 7-day trial
            </div>
          </motion.div>
        </motion.div>

        {/* Example feature box on right */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="relative bg-card rounded-2xl p-6 md:p-8 shadow-2xl border">
            <div className="absolute -inset-1 bg-linear-to-r from-chart-2 to-chart-3 rounded-2xl blur opacity-20 dark:opacity-30"></div>
            <div className="relative bg-card rounded-xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-red-400 rounded-full"></div>
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-green-400 rounded-full"></div>
                </div>
                <div className="text-xs md:text-sm font-medium">
                  shei-hoise.com/[storeName]
                </div>
              </div>
              <div className="space-y-3 md:space-y-4">
                {[
                  {
                    icon: Package,
                    title: "Product Management",
                    iconRight: TrendingUp,
                  },
                  {
                    icon: ShoppingCart,
                    title: "Order Tracking",
                    iconRight: Users,
                  },
                  {
                    icon: BarChart3,
                    title: "Stock Management",
                    iconRight: Shield,
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex justify-between items-center p-3 md:p-4 bg-muted rounded-lg"
                  >
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <item.icon className="w-4 h-4 md:w-5 md:h-5 text-chart-2" />
                      <span className="text-sm md:text-base">{item.title}</span>
                    </div>
                    <item.iconRight className="w-4 h-4 md:w-5 md:h-5 text-chart-3" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
