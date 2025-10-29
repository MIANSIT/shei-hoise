"use client";
import React from "react";
import { Button } from "antd";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4 text-center">
      {/* 404 SVG */}
      <motion.img
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        src="/404.svg"
        alt="404"
        className="w-48 sm:w-48 md:w-64 lg:w-96 mb-4 sm:mb-6 mx-auto"
      />

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-4 sm:mb-6"
      >
        Oops! The page you’re looking for doesn’t exist or has been moved.
      </motion.p>

      {/* Not Found Illustration */}
      <motion.img
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        src="/notfound.svg"
        alt="Page not found"
        className="w-32 sm:w-64 md:w-80 lg:w-72 mb-6 mx-auto"
      />

      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <Button
          type="primary"
          size="large"
          onClick={() => router.push("/")}
          className="px-6 py-3 shadow-lg hover:shadow-xl transition-shadow text-sm sm:text-base"
        >
          Back to Store
        </Button>
      </motion.div>
    </div>
  );
}
