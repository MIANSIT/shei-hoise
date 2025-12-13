// components/common/PasswordStrength.tsx
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

interface PasswordStrengthProps {
  password: string | undefined;
  className?: string;
}

export function PasswordStrength({ password, className = "" }: PasswordStrengthProps) {
  if (!password) return null;

  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const strength = Object.values(checks).filter(Boolean).length;
  const strengthText = ["Very Weak", "Weak", "Fair", "Good", "Strong"][strength - 1] || "Very Weak";
  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-500",
    "bg-emerald-500"
  ];
  const textColors = [
    "text-red-500",
    "text-orange-500",
    "text-yellow-500",
    "text-green-500",
    "text-emerald-500"
  ];

  const currentColor = strengthColors[strength - 1] || "bg-gray-300";
  const currentTextColor = textColors[strength - 1] || "text-gray-500";

  return (
    <motion.div 
      className={`space-y-3 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${currentTextColor}`}>
          Password strength: <span className="font-bold">{strengthText}</span>
        </span>
        <span className="text-xs font-bold text-muted-foreground">
          {strength}/5
        </span>
      </div>
      
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <motion.div
          className={`h-2 rounded-full ${currentColor}`}
          initial={{ width: "0%" }}
          animate={{ width: `${(strength / 5) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(checks).map(([key, passed]) => {
          const label = {
            length: "8+ characters",
            uppercase: "Uppercase letter",
            lowercase: "Lowercase letter",
            number: "Number",
            special: "Special character"
          }[key];
          
          return (
            <motion.div
              key={key}
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: key === "length" ? 0.1 : 
                         key === "uppercase" ? 0.2 : 
                         key === "lowercase" ? 0.3 : 
                         key === "number" ? 0.4 : 0.5 }}
            >
              <motion.div
                animate={passed ? {
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                } : {}}
                transition={{ duration: 0.3 }}
              >
                <CheckCircle
                  className={`h-4 w-4 ${passed ? "text-green-500" : "text-gray-300 dark:text-gray-600"}`}
                />
              </motion.div>
              <span className={`text-xs ${passed ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}