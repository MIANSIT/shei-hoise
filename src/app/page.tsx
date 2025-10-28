// app/page.tsx
"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Package,
  TrendingUp,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Users,
  BarChart3,
  CreditCard,
  Truck,
} from "lucide-react";
import { useRef } from "react";
import Footer from "./components/common/Footer";
import Header from "./components/common/Header";

export default function LandingPage() {
  const featuresRef = useRef<HTMLDivElement>(null);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fadeInUp = {
    initial: { y: 60, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.6 },
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const pricingPlans = [
    {
      name: "Starter",
      price: "$499",
      period: "/month",
      description: "Perfect for small businesses getting started",
      features: [
        "Up to 100 products",
        "Basic inventory management",
        "Customer order management",
        "Cash on Delivery payments",
        "Email support",
      ],
      highlighted: false,
    },
    {
      name: "Growth",
      price: "$999",
      period: "/month",
      description: "Everything you need to grow your business",
      features: [
        "Up to 1000 products",
        "Advanced inventory management",
        "Bulk stock updates",
        "Order tracking system",
        "Priority support",
        "Sales analytics",
      ],
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "$1,999",
      period: "/month",
      description: "For established businesses with high volume",
      features: [
        "Unlimited products",
        "Advanced analytics dashboard",
        "Custom domain support",
        "Dedicated account manager",
        "API access",
        "Custom integrations",
      ],
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Use your existing Header component */}
      <Header />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-20 md:pt-32 pb-20 px-6">
          <div className="container mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
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
                  <span className="text-chart-2">Store Management</span>{" "}
                  Experience
                </motion.h1>

                <motion.p
                  variants={fadeInUp}
                  className="text-lg md:text-xl text-muted-foreground mt-6 mb-8 leading-relaxed"
                >
                  Shei-Hoise empowers store owners with seamless inventory
                  management, customer orders, and real-time tracking. Start
                  your personalized store at{" "}
                  <span className="font-semibold text-foreground">
                    shei-hoise/your-store-name
                  </span>{" "}
                  today!
                </motion.p>

                <motion.div
                  variants={fadeInUp}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Button
                    size="lg"
                    className="bg-chart-2 hover:bg-chart-2/90 text-white px-6 md:px-8 py-3 text-base md:text-lg"
                    onClick={scrollToFeatures}
                  >
                    Explore Features
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="px-6 md:px-8 py-3 text-base md:text-lg"
                  >
                    View Demo
                  </Button>
                </motion.div>

                <motion.div
                  variants={fadeInUp}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mt-8 text-sm text-muted-foreground"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-chart-2" />
                    No credit card required
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-chart-2" />
                    Setup in 5 minutes
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-chart-2" />
                    Free 14-day trial
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="relative bg-card rounded-2xl p-6 md:p-8 shadow-2xl border">
                  <div className="absolute -inset-1 bg-gradient-to-r from-chart-2 to-chart-3 rounded-2xl blur opacity-20 dark:opacity-30"></div>
                  <div className="relative bg-card rounded-xl p-4 md:p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-red-400 rounded-full"></div>
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full"></div>
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-green-400 rounded-full"></div>
                      </div>
                      <div className="text-xs md:text-sm font-medium">
                        shei-hoise/[storeName].com
                      </div>
                    </div>

                    <div className="space-y-3 md:space-y-4">
                      <div className="flex justify-between items-center p-3 md:p-4 bg-muted rounded-lg">
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <Package className="w-4 h-4 md:w-5 md:h-5 text-chart-2" />
                          <span className="text-sm md:text-base">
                            Product Management
                          </span>
                        </div>
                        <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-chart-3" />
                      </div>

                      <div className="flex justify-between items-center p-3 md:p-4 bg-muted rounded-lg">
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-chart-2" />
                          <span className="text-sm md:text-base">
                            Order Tracking
                          </span>
                        </div>
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-chart-3" />
                      </div>

                      <div className="flex justify-between items-center p-3 md:p-4 bg-muted rounded-lg">
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-chart-2" />
                          <span className="text-sm md:text-base">
                            Stock Management
                          </span>
                        </div>
                        <Shield className="w-4 h-4 md:w-5 md:h-5 text-chart-3" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          ref={featuresRef}
          className="py-16 md:py-20 px-6 bg-muted/30"
        >
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything You Need to Manage Your Store
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed specifically for store owners to
                streamline operations and boost sales.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {[
                {
                  icon: ShoppingCart,
                  title: "Seamless Shopping Cart",
                  description:
                    "Customers can easily add products, checkout, and track orders with real-time updates.",
                  color: "text-chart-1",
                },
                {
                  icon: Package,
                  title: "Product Management",
                  description:
                    "Add products, update details, and manage your entire catalog from one dashboard.",
                  color: "text-chart-2",
                },
                {
                  icon: TrendingUp,
                  title: "Stock Management",
                  description:
                    "Real-time stock tracking with bulk update capabilities and low stock alerts.",
                  color: "text-chart-3",
                },
                {
                  icon: Users,
                  title: "Customer Orders",
                  description:
                    "Create and manage customer orders directly with cash on delivery support.",
                  color: "text-chart-4",
                },
                {
                  icon: Truck,
                  title: "Order Tracking",
                  description:
                    "Complete order lifecycle tracking from placement to delivery.",
                  color: "text-chart-5",
                },
                {
                  icon: CreditCard,
                  title: "Cash on Delivery",
                  description:
                    "Support for COD payments with secure order processing and tracking.",
                  color: "text-chart-1",
                },
              ].map((feature, index) => (
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
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-20 px-6">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                How Shei-Hoise Works
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Get your personalized store up and running in just a few simple
                steps
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                {
                  step: "01",
                  title: "Sign Up & Create Store",
                  description:
                    "Register and get your personalized store URL: shei-hoise/your-store-name",
                },
                {
                  step: "02",
                  title: "Add Your Products",
                  description:
                    "Upload products, set prices, and manage inventory with bulk updates",
                },
                {
                  step: "03",
                  title: "Start Selling",
                  description:
                    "Share your store link with customers and start accepting orders with COD",
                },
              ].map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 bg-chart-2 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-16 md:py-20 px-6 bg-muted/30">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Start free for 14 days. No credit card required. Choose the plan
                that fits your business needs.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
              {pricingPlans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className={`relative rounded-2xl p-6 md:p-8 ${
                    plan.highlighted
                      ? "bg-chart-2 text-white shadow-2xl border-0"
                      : "bg-card border shadow-lg"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 md:-top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-chart-3 text-white px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <h3
                    className={`text-xl md:text-2xl font-bold mb-2 ${
                      plan.highlighted ? "text-white" : ""
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={`mb-4 md:mb-6 text-sm md:text-base ${
                      plan.highlighted
                        ? "text-white/80"
                        : "text-muted-foreground"
                    }`}
                  >
                    {plan.description}
                  </p>

                  <div className="mb-4 md:mb-6">
                    <span className="text-3xl md:text-4xl font-bold">
                      {plan.price}
                    </span>
                    <span
                      className={
                        plan.highlighted
                          ? "text-white/80"
                          : "text-muted-foreground"
                      }
                    >
                      {plan.period}
                    </span>
                  </div>

                  <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 md:gap-3"
                      >
                        <CheckCircle
                          className={`w-4 h-4 md:w-5 md:h-5 mt-0.5 flex-shrink-0 ${
                            plan.highlighted ? "text-white" : "text-chart-2"
                          }`}
                        />
                        <span
                          className={`text-sm md:text-base ${
                            plan.highlighted ? "text-white/90" : ""
                          }`}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full ${
                      plan.highlighted
                        ? "bg-white text-chart-2 hover:bg-white/90"
                        : "bg-chart-2 hover:bg-chart-2/90 text-white"
                    }`}
                    size="lg"
                  >
                    Get Started
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 px-6 bg-muted/50 border border-chart-2/20">
          <div className="container mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Transform Your Store Management?
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join hundreds of store owners who are already using Shei-Hoise
                to streamline their business operations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-chart-2 hover:bg-chart-2/90 text-white px-6 md:px-8 py-3 text-base md:text-lg font-semibold"
                >
                  Start Free Trial
                  <Zap className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-chart-2 text-chart-2 hover:bg-chart-2/10 px-6 md:px-8 py-3 text-base md:text-lg"
                >
                  Schedule Demo
                </Button>
              </div>
              <p className="mt-4 text-xs md:text-sm text-muted-foreground">
                No credit card required • 14-day free trial • Setup in minutes
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Use your existing Footer component */}
      <Footer />
    </div>
  );
}
