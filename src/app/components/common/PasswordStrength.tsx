// components/common/PasswordStrength.tsx
import { CheckCircle } from "lucide-react";

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
  const strengthText = ["Very Weak", "Weak", "Fair", "Good", "Strong"][
    strength - 1
  ] || "Very Weak";

  return (
    <div className={`mt-2 space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span>Password strength: {strengthText}</span>
        <span>{strength}/5</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            strength <= 2
              ? "bg-red-500"
              : strength <= 3
              ? "bg-yellow-500"
              : "bg-green-500"
          }`}
          style={{ width: `${(strength / 5) * 100}%` }}
        ></div>
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <CheckCircle
            className={`h-3 w-3 ${
              checks.length ? "text-green-500" : "text-gray-300"
            }`}
          />
          <span>8+ characters</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle
            className={`h-3 w-3 ${
              checks.uppercase ? "text-green-500" : "text-gray-300"
            }`}
          />
          <span>Uppercase letter</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle
            className={`h-3 w-3 ${
              checks.lowercase ? "text-green-500" : "text-gray-300"
            }`}
          />
          <span>Lowercase letter</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle
            className={`h-3 w-3 ${
              checks.number ? "text-green-500" : "text-gray-300"
            }`}
          />
          <span>Number</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle
            className={`h-3 w-3 ${
              checks.special ? "text-green-500" : "text-gray-300"
            }`}
          />
          <span>Special character</span>
        </div>
      </div>
    </div>
  );
}