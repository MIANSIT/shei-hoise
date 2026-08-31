// components/common/PasswordStrength.tsx
import { CheckCircle } from "lucide-react";
import { m } from "framer-motion";

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

  const labels: Record<keyof typeof checks, string> = {
    length: "8 Chars",
    uppercase: "A-Z",
    lowercase: "a-z",
    number: "123",
    special: "@#$",
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
    <m.div
      className={`space-y-2.5 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Password Strength
        </span>
        <span className={`text-xs font-bold ${currentTextColor}`}>
          {strengthText}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <m.div
          className={`h-1.5 rounded-full ${currentColor}`}
          initial={{ width: "0%" }}
          animate={{ width: `${(strength / 5) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {(Object.keys(checks) as (keyof typeof checks)[]).map((key, index) => {
          const passed = checks[key];

          return (
            <m.div
              key={key}
              className="flex items-center gap-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <m.div
                animate={passed ? {
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                } : {}}
                transition={{ duration: 0.3 }}
              >
                <CheckCircle
                  className={`h-3.5 w-3.5 ${passed ? "text-green-500" : "text-muted-foreground"}`}
                />
              </m.div>
              <span className={`text-xs ${passed ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {labels[key]}
              </span>
            </m.div>
          );
        })}
      </div>
    </m.div>
  );
}
