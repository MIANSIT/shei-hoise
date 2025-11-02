"use client";

import { motion } from "framer-motion";
import { ShoppingCart, Package, TrendingUp, Users, Truck, CreditCard } from "lucide-react";

export default function FeaturesSection() {
  const features = [
    { icon: ShoppingCart, title: "Seamless Shopping Cart", description: "Customers can easily add products, checkout, and track orders with real-time updates.", color: "text-chart-1" },
    { icon: Package, title: "Product Management", description: "Add products, update details, and manage your entire catalog from one dashboard.", color: "text-chart-2" },
    { icon: TrendingUp, title: "Stock Management", description: "Real-time stock tracking with bulk update capabilities and low stock alerts.", color: "text-chart-3" },
    { icon: Users, title: "Customer Orders", description: "Create and manage customer orders directly with cash on delivery support.", color: "text-chart-4" },
    { icon: Truck, title: "Order Tracking", description: "Complete order lifecycle tracking from placement to delivery.", color: "text-chart-5" },
    { icon: CreditCard, title: "Cash on Delivery", description: "Support for COD payments with secure order processing and tracking.", color: "text-chart-1" },
  ];

  return (
    <section id="features" className="py-16 md:py-20 px-6 bg-muted/30">
      <div className="container mx-auto text-center mb-12 md:mb-16">
        <motion.h2 initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-3xl md:text-4xl font-bold mb-4">
          Everything You Need to Manage Your Store
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Powerful features designed specifically for store owners to streamline operations and boost sales.
        </motion.p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {features.map((feature, index) => (
          <motion.div key={feature.title} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: index * 0.1 }} whileHover={{ y: -5 }} className="bg-card p-6 rounded-xl shadow-lg border hover:shadow-xl transition-all">
            <div className={`w-10 h-10 md:w-12 md:h-12 ${feature.color} bg-muted rounded-lg flex items-center justify-center mb-4`}>
              <feature.icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold mb-3">{feature.title}</h3>
            <p className="text-sm md:text-base text-muted-foreground">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
