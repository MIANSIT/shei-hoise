// app/not-found.tsx
"use client";
import React from "react";
import { Button } from "antd";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="text-9xl font-extrabold text-gray-800 dark:text-white mb-6"
      >
        404
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8"
      >
        Oops! The page you’re looking for doesn’t exist or has been moved.
      </motion.p>
      <motion.img
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        src="/404-ecommerce-illustration.svg"
        alt="Page not found"
        className="w-64 md:w-80 mb-8 mx-auto"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <Button
          type="primary"
          size="large"
          onClick={() => router.push("/")}
          className="shadow-lg hover:shadow-xl transition-shadow"
        >
          Back to Store
        </Button>
      </motion.div>
    </div>
  );
}
