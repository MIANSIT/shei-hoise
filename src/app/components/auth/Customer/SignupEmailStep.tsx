"use client";

import { PillField } from "../../common/PillField";
import { Check } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";

interface SignupEmailStepProps {
  email: string;
  setEmail: (email: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  disabled: boolean;
  error?: string;
}

export function SignupEmailStep({
  email,
  setEmail,
  onKeyPress,
  disabled,
  error,
}: SignupEmailStepProps) {
  const t = useTranslation();
  return (
    <div className="space-y-3">
      <PillField
        id="email"
        type="email"
        label={t.auth.emailAddressLabel}
        value={email}
        onChange={setEmail}
        onKeyPress={onKeyPress}
        placeholder={t.auth.emailPlaceholder}
        disabled={disabled}
        autoFocus
        rightElement={
          email && email.includes("@") && !error ? (
            <Check className="h-5 w-5 shrink-0 text-green-500" />
          ) : undefined
        }
      />
      {error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t.auth.weUseForAccount}
        </p>
      )}
    </div>
  );
}