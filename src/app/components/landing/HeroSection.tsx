"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

const MotionButton = motion(Button);

const pnl = [
  { label: "Revenue", value: "৳6,801", color: "text-chart-2", border: "border-t-chart-2" },
  { label: "Expenses", value: "৳100", color: "text-chart-5", border: "border-t-chart-5" },
  { label: "Net Profit", value: "৳647", color: "text-chart-2", border: "border-t-chart-2" },
];

const pipeline = [
  { label: "Delivered", count: 13, dot: "bg-chart-2", text: "text-chart-2" },
  { label: "Shipped", count: 1, dot: "bg-chart-3", text: "text-chart-3" },
  { label: "Pending", count: 0, dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
  { label: "Cancelled", count: 0, dot: "bg-chart-5/50", text: "text-muted-foreground" },
];

const salesBars = [2, 4, 3, 6, 8, 5, 3, 4, 7, 9, 6, 8, 5, 4, 6, 7];

export default function HeroSection() {
  const router = useRouter();

  const fadeInUp = {
    initial: { y: 50, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.6, ease: "easeOut" },
  };

  const stagger = {
    animate: { transition: { staggerChildren: 0.12 } },
  };

  const stats = [
    { value: "500+", label: "Active Stores" },
    { value: "10k+", label: "Orders Managed" },
    { value: "7-Day", label: "Free Trial" },
  ];

  return (
    <>
      <section className="pt-10 md:pt-20 pb-16 px-3">
        <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">

          {/* LEFT — Copy */}
          <motion.div
            initial="initial"
            animate="animate"
            variants={stagger}
            className="space-y-8"
          >
            {/* BADGE */}
            <motion.div variants={fadeInUp}>
              <span className="inline-flex items-center gap-2 bg-chart-2/10 text-chart-2 text-xs font-semibold px-4 py-1.5 rounded-full border border-chart-2/20">
                <Zap className="w-3 h-3" />
                Built for Independent Store Owners
              </span>
            </motion.div>

            {/* HEADLINE */}
            <motion.h1
              variants={fadeInUp}
              className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
            >
              Run Your Store
              <br />
              <span className="text-chart-2">Without the Chaos.</span>
            </motion.h1>

            {/* SUBTEXT */}
            <motion.p
              variants={fadeInUp}
              className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg"
            >
              Track profits and expenses, manage every order through the full
              pipeline, monitor inventory health, and get paid on time. All from
              one powerful business dashboard.
            </motion.p>

            {/* CTA BUTTONS */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4"
            >
              <MotionButton
                size="lg"
                className="w-full sm:w-auto bg-chart-2 hover:bg-chart-2/90 text-background px-8 py-4 text-base sm:text-lg flex items-center justify-center"
                whileTap={{ scale: 0.96 }}
                onClick={() => router.push("/onboarding")}
              >
                Start for Free
                <ArrowRight className="ml-2 hidden sm:block w-5 h-5" />
              </MotionButton>

              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-8 py-4 text-base sm:text-lg"
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                See How It Works
              </Button>
            </motion.div>

            {/* TRUST BADGES */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-wrap gap-4 text-sm text-muted-foreground"
            >
              {["7-day free trial", "No credit card required", "Cancel anytime"].map(
                (text, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-chart-2" />
                    {text}
                  </div>
                )
              )}
            </motion.div>

            {/* STATS */}
            <motion.div
              variants={fadeInUp}
              className="flex gap-8 pt-4 border-t border-border"
            >
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-chart-2">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT — Professional Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative"
          >
            {/* Ambient glow */}
            <div className="absolute -inset-4 bg-linear-to-br from-chart-2/20 via-chart-3/10 to-transparent rounded-3xl blur-2xl pointer-events-none" />

            {/* App window frame */}
            <div className="relative rounded-2xl border shadow-2xl bg-card overflow-hidden">

              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b">
                <span className="w-2.5 h-2.5 rounded-full bg-chart-5/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-chart-3/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-chart-2/80" />
                <div className="ml-2 flex-1 bg-background/70 rounded px-3 py-0.5 border border-border/50">
                  <p className="text-[10px] text-muted-foreground">
                    shei-hoise.com/dashboard
                  </p>
                </div>
              </div>

              {/* App layout: sidebar + content */}
              <div className="flex">

                {/* Minimal sidebar — hidden on mobile */}
                <div className="hidden lg:flex w-9 bg-muted/20 border-r flex-col items-center pt-3 pb-3 gap-2.5">
                  <div className="w-4 h-4 bg-chart-2/30 rounded-sm" />
                  <div className="w-4 h-px bg-border" />
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-4 h-4 bg-muted-foreground/10 rounded-sm" />
                  ))}
                </div>

                {/* Dashboard content */}
                <div className="flex-1 p-3 space-y-3 min-w-0">

                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold leading-tight">Business Overview</p>
                      <p className="text-[9px] text-muted-foreground">Mon, Apr 27, 2026</p>
                    </div>
                    <div className="flex gap-1">
                      {["7D", "30D", "1Y"].map((d) => (
                        <span
                          key={d}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                            d === "30D"
                              ? "bg-chart-2 text-background"
                              : "text-muted-foreground"
                          }`}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Alert banner */}
                  <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-700/30 rounded px-2 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <p className="text-[9px] text-amber-700 dark:text-amber-400 font-medium truncate">
                      2 alerts need your attention
                    </p>
                  </div>

                  {/* P&L Snapshot */}
                  <div>
                    <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-widest mb-1.5">
                      Profit & Loss · Last 30 Days
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {pnl.map((item) => (
                        <div
                          key={item.label}
                          className={`bg-muted rounded p-2 text-center border-t-2 ${item.border}`}
                        >
                          <p className={`text-[11px] font-bold ${item.color}`}>
                            {item.value}
                          </p>
                          <p className="text-[8px] text-muted-foreground mt-0.5">
                            {item.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Pipeline */}
                  <div>
                    <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-widest mb-1.5">
                      Order Pipeline
                    </p>
                    <div className="space-y-1">
                      {pipeline.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between bg-muted/60 rounded px-2 py-1"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`} />
                            <span className="text-[10px]">{item.label}</span>
                          </div>
                          <span className={`text-[10px] font-bold ${item.text}`}>
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Flow */}
                  <div>
                    <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-widest mb-1.5">
                      Payment Flow
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-chart-2/10 rounded p-2">
                        <p className="text-[11px] font-bold text-chart-2">৳8,650</p>
                        <p className="text-[8px] text-muted-foreground">Collected</p>
                      </div>
                      <div className="bg-chart-3/10 rounded p-2">
                        <p className="text-[11px] font-bold text-chart-3">৳430</p>
                        <p className="text-[8px] text-muted-foreground">Awaiting</p>
                      </div>
                    </div>
                  </div>

                  {/* Sales Trend */}
                  <div>
                    <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-widest mb-1.5">
                      Sales Trend
                    </p>
                    <div className="flex items-end gap-0.5 h-7">
                      {salesBars.map((h, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-sm transition-all ${
                            i >= salesBars.length - 4
                              ? "bg-chart-2"
                              : "bg-muted-foreground/20"
                          }`}
                          style={{ height: `${(h / 9) * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* STICKY MOBILE CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
        <div className="bg-background border-t p-3">
          <MotionButton
            className="w-full bg-chart-2 text-background py-4 text-base"
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(34,197,94,0.6)",
                "0 0 0 14px rgba(34,197,94,0)",
              ],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push("/onboarding")}
          >
            Start 7-Day Free Trial
          </MotionButton>
        </div>
      </div>
    </>
  );
}
