"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-background px-4 text-center overflow-hidden">
      {/* Background glow — matches homepage hero blur */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-chart-2/10 rounded-full blur-3xl pointer-events-none" />

      {/* 404 layered number */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
        className="relative select-none mb-2"
      >
        <span className="text-[140px] md:text-[200px] font-extrabold leading-none text-chart-2/10">
          404
        </span>
        <span className="absolute inset-0 flex items-center justify-center text-5xl md:text-7xl font-extrabold text-chart-2">
          404
        </span>
      </motion.div>

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl md:text-3xl font-bold text-foreground mb-3"
      >
        Page Not Found
      </motion.h1>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-base md:text-lg text-muted-foreground max-w-md mb-8"
      >
        The page you are looking for does not exist or has been moved.
      </motion.p>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {/* <Button
          size="lg"
          className="bg-chart-2 hover:bg-chart-2/90 text-background px-8"
          onClick={() => router.push("/")}
        >
          <Home className="mr-2 w-4 h-4" />
          Go Home
        </Button> */}
        <Button
          variant="outline"
          size="lg"
          className="px-8"
          onClick={handleBack}
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          Go Back
        </Button>
      </motion.div>
    </div>
  );
}
