"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  BarChart3,
  DollarSign,
} from "lucide-react";
import ContactUSForm from "@/app/components/contactUs/ContactUsForm";
import Modal from "@/app/components/common/Modal";
import { useState } from "react";
import { useRouter } from "next/navigation";

// ✅ Motion-enabled shadcn button
const MotionButton = motion(Button);

export default function HeroSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const fadeInUp = {
    initial: { y: 50, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.6, ease: "easeOut" },
  };

  const stagger = {
    animate: { transition: { staggerChildren: 0.12 } },
  };

  return (
    <>
      {/* HERO */}
      <section className='pt-5 md:pt-15 pb-15 px-3'>
        <div className='container mx-auto grid lg:grid-cols-2 gap-12 items-center'>
          {/* LEFT */}
          <motion.div
            initial='initial'
            animate='animate'
            variants={stagger}
            className='space-y-8'
          >
            {/* HEADLINE */}
            <motion.h1
              variants={fadeInUp}
              className='text-3xl md:text-4xl lg:text-5xl font-bold leading-tight'
            >
              Run Your Store Smarter — <br />
              <span className='text-chart-2'>Cash, Orders & Inventory</span>
              <br />
              All in One Dashboard
            </motion.h1>

            {/* SUBTEXT */}
            <motion.p
              variants={fadeInUp}
              className='text-md md:text-lg text-muted-foreground'
            >
              Manage products, track orders, and grow sales — no spreadsheets,
              no hassle.
              <br className='hidden sm:block' />
              Try free for 7 days. Pay only if you continue.
            </motion.p>

            {/* CTA BUTTONS */}
            <motion.div
              variants={fadeInUp}
              className='flex flex-col sm:flex-row gap-4'
            >
              <MotionButton
                size='lg'
                className='w-full sm:w-auto bg-chart-2 hover:bg-chart-2/90 text-background px-8 py-4 text-base sm:text-lg flex items-center justify-center'
                whileTap={{ scale: 0.96 }}
                onClick={() => router.push("/onboarding")}
              >
                Get Your Store
                <ArrowRight className='ml-2 hidden sm:block w-5 h-5' />
              </MotionButton>

              <Button
                variant='outline'
                size='lg'
                className='w-full sm:w-auto px-8 py-4 text-base sm:text-lg'
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Explore Features
              </Button>
            </motion.div>

            {/* TRUST BADGES */}
            <motion.div
              variants={fadeInUp}
              className='flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground'
            >
              {[
                "7-day free trial",
                "No credit card required",
                "Cancel anytime",
              ].map((text, idx) => (
                <div key={idx} className='flex items-center gap-2'>
                  <CheckCircle className='w-4 h-4 text-chart-2' />
                  {text}
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT MOCKUP */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className='relative bg-card rounded-2xl p-6 shadow-2xl border'>
              <div className='absolute -inset-1 bg-linear-to-r from-chart-2 to-chart-3 rounded-2xl blur opacity-20' />
              <div className='relative bg-card rounded-xl p-6 space-y-4'>
                {[
                  {
                    icon: Package,
                    t: "Organize Products Easily",
                    r: TrendingUp,
                  },
                  { icon: ShoppingCart, t: "Track Orders Instantly", r: Users },
                  {
                    icon: BarChart3,
                    t: "Manage Stock Effortlessly",
                    r: Package,
                  },
                  { icon: DollarSign, t: "Control Cash Flow", r: TrendingUp },
                ].map((i) => (
                  <div
                    key={i.t}
                    className='flex justify-between items-center bg-muted p-4 rounded-lg hover:scale-105 transition-transform duration-200 '
                  >
                    <div className='flex items-center gap-3'>
                      <i.icon className='w-5 h-5 text-chart-2' />
                      <span>{i.t}</span>
                    </div>
                    <i.r className='w-5 h-5 text-chart-3' />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <Modal isOpen onClose={() => setIsModalOpen(false)}>
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            >
              <ContactUSForm
                source='store_setup'
                title='Get Your Store'
                subtitle='Use all features free for 7 days. Subscription required after trial.'
                buttonText='Start Free Trial'
              />
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      {/* 🔥 STICKY MOBILE CTA (BEST CONVERSION) */}
      <div className='fixed bottom-0 left-0 right-0 z-50 sm:hidden'>
        <div className='bg-background border-t p-3'>
          <MotionButton
            className='w-full bg-chart-2 text-background py-4 text-base'
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(34,197,94,0.6)",
                "0 0 0 14px rgba(34,197,94,0)",
              ],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeOut",
            }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsModalOpen(true)}
          >
            Start 7-Day Free Trial
          </MotionButton>
        </div>
      </div>
    </>
  );
}
//herosection
