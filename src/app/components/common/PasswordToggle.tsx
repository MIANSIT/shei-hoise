// components/common/PasswordToggle.tsx
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
      className={`flex items-center justify-center p-2 rounded-full hover:bg-accent/20 transition-colors ${className || ""}`}
      whileHover={{
        scale: 1.1,
        backgroundColor: "rgba(0, 0, 0, 0.05)",
      }}
      whileTap={{ scale: 0.95 }}
      initial={false}
      aria-label={show ? "Hide password" : "Show password"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {show ? (
          <motion.div
            key="eye-off"
            initial={{ opacity: 0, scale: 0.7, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.7, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            <EyeOff size={size} className="text-muted-foreground" />
          </motion.div>
        ) : (
          <motion.div
            key="eye"
            initial={{ opacity: 0, scale: 0.7, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.7, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            <Eye size={size} className="text-muted-foreground" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}