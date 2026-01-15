"use client";

import { Input, Checkbox } from "antd";
import { Controller, Control, UseFormReturn } from "react-hook-form";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import { FormItemWrapper } from "./FormItemWrapper";
import { useState, useEffect } from "react";

interface Props {
  control: Control<CreateUserType>;
  formState: UseFormReturn<CreateUserType>;
  onValidationChange?: (isValid: boolean) => void;
}

export default function FinalizeAccount({
  control,
  formState,
  onValidationChange,
}: Props) {
  const {
    formState: { errors },
  } = formState;

  // Local state ONLY for UI validation
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [termsError, setTermsError] = useState("");

  // Get password from form
  const passwordValue = formState.getValues("password");

  // Validate on change
  const handleConfirmChange = (value: string) => {
    setConfirmPassword(value);
    if (value !== passwordValue) {
      setConfirmError("Passwords do not match");
    } else {
      setConfirmError("");
    }
  };

  const handleTermsChange = (checked: boolean) => {
    setAcceptTerms(checked);
    if (!checked) {
      setTermsError("You must accept Terms & Privacy");
    } else {
      setTermsError("");
    }
  };

  // Update validation status whenever dependencies change
  useEffect(() => {
    const isValid = confirmPassword === passwordValue && acceptTerms;
    if (onValidationChange) {
      onValidationChange(isValid);
    }
  }, [confirmPassword, passwordValue, acceptTerms, onValidationChange]);

  // Also validate when password changes
  useEffect(() => {
    if (confirmPassword && confirmPassword !== passwordValue) {
      setConfirmError("Passwords do not match");
    } else if (confirmPassword) {
      setConfirmError("");
    }
  }, [passwordValue, confirmPassword]);

  return (
    <div className="bg-card text-card-foreground shadow-md rounded-xl p-6 space-y-6">
      <h3 className="text-2xl font-semibold mb-4">Finalize Account</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Set your account credentials and accept the terms & privacy policy.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {/* Email (readonly) */}
        <FormItemWrapper
          label={<span className="text-foreground">Email</span>}
          error={errors.email?.message}
        >
          <Input
            value={formState.getValues("email") || ""}
            readOnly
            className="rounded-lg bg-input text-foreground border-border cursor-not-allowed"
          />
        </FormItemWrapper>

        {/* Password */}
        <FormItemWrapper
          label={<span className="text-foreground">Password</span>}
          error={errors.password?.message}
        >
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                placeholder="Enter password"
                className="rounded-lg bg-input text-foreground border-border"
              />
            )}
          />
        </FormItemWrapper>

        {/* Confirm Password (UI-only, not in form data) */}
        <FormItemWrapper
          label={<span className="text-foreground">Confirm Password</span>}
          error={confirmError}
        >
          <Input.Password
            value={confirmPassword}
            placeholder="Confirm password"
            onChange={(e) => handleConfirmChange(e.target.value)}
            className="rounded-lg bg-input text-foreground border-border"
          />
        </FormItemWrapper>

        {/* Terms & Privacy (UI-only, not in form data) */}
        <FormItemWrapper label="" error={termsError}>
          <Checkbox
            checked={acceptTerms}
            onChange={(e) => handleTermsChange(e.target.checked)}
          >
            I agree to the <span className="underline">Terms & Privacy</span>
          </Checkbox>
        </FormItemWrapper>
      </div>
    </div>
  );
}
