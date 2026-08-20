"use client";

import { PasswordField } from "../../../components/common/PasswordField";
import { PasswordStrength } from "../../../components/common/PasswordStrength";
import { Check } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";

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
  const t = useTranslation();

  const passwordsMatch = password === confirmPassword && password.length > 0;

  return (
    <>
      <div className="space-y-3">
        <PasswordField
          id="password"
          label={t.auth.password}
          value={password}
          onChange={setPassword}
          onKeyPress={onKeyPress}
          disabled={disabled}
        />
        <PasswordStrength password={password} />
      </div>

      <div className="space-y-3">
        <PasswordField
          id="confirmPassword"
          label={t.auth.confirmPassword}
          value={confirmPassword}
          onChange={setConfirmPassword}
          onKeyPress={onKeyPress}
          disabled={disabled}
        />
        {confirmPassword.length > 0 && !passwordsMatch && (
          <p className="text-sm text-red-500 flex items-center gap-2 mt-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
            {t.auth.passwordsDoNotMatch}
          </p>
        )}
        {confirmPassword.length > 0 && passwordsMatch && (
          <p className="text-sm text-green-600 flex items-center gap-2 mt-2">
            <Check className="h-4 w-4" />
            {t.auth.passwordsMatch}
          </p>
        )}
      </div>
    </>
  );
}