"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <Label htmlFor="email" className="text-base font-semibold">
        {t.auth.emailAddressLabel}
      </Label>
      <div className="relative">
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={t.auth.emailPlaceholder}
          className="text-base pr-12"
          disabled={disabled}
          autoFocus
        />
        {email && email.includes("@") && !error && (
          <Check className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
        )}
      </div>
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