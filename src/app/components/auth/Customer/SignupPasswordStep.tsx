"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordToggle } from "../../../components/common/PasswordToggle";
import { PasswordStrength } from "../../../components/common/PasswordStrength";
import { Check } from "lucide-react";

interface SignupPasswordStepProps {
  password: string;
  setPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  disabled: boolean;
}

export function SignupPasswordStep({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onKeyPress,
  disabled,
}: SignupPasswordStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const passwordsMatch = password === confirmPassword && password.length > 0;

  return (
    <>
      <div className="space-y-3">
        <Label htmlFor="password" className="text-base font-semibold">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="••••••••"
            className="text-base pr-14"
            disabled={disabled}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <PasswordToggle
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              size={22}
              className="hover:bg-accent/20"
            />
          </div>
        </div>
        <PasswordStrength password={password} />
      </div>

      <div className="space-y-3">
        <Label htmlFor="confirmPassword" className="text-base font-semibold">
          Confirm Password
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="••••••••"
            className="text-base pr-14"
            disabled={disabled}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <PasswordToggle
              show={showConfirmPassword}
              onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
              size={22}
              className="hover:bg-accent/20"
            />
          </div>
        </div>
        {confirmPassword.length > 0 && !passwordsMatch && (
          <p className="text-sm text-red-500 flex items-center gap-2 mt-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
            Passwords do not match
          </p>
        )}
        {confirmPassword.length > 0 && passwordsMatch && (
          <p className="text-sm text-green-600 flex items-center gap-2 mt-2">
            <Check className="h-4 w-4" />
            Passwords match
          </p>
        )}
      </div>
    </>
  );
}