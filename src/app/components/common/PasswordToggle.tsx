"use client";

import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PasswordToggleProps {
  show: boolean;
  onToggle: () => void;
  size?: number;
  className?: string;
}

export function PasswordToggle({
  show,
  onToggle,
  size = 20,
  className,
}: PasswordToggleProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      className={`flex items-center justify-center p-2 rounded-full ${className || ""}`}
      whileHover={{
        scale: 1.2,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))",
      }}
      whileTap={{ scale: 0.95 }}
      initial={false}
    >
      <AnimatePresence mode="wait" initial={false}>
        {show ? (
          <motion.div
            key="eye-off"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.2 }}
          >
            <EyeOff size={size} className="text-gray-400" />
          </motion.div>
        ) : (
          <motion.div
            key="eye"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.2 }}
          >
            <Eye size={size} className="text-gray-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
