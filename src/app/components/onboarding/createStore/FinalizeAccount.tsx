"use client";

import { Input, Checkbox, Tooltip } from "antd";
import { Controller, Control, UseFormReturn } from "react-hook-form";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import { FormItemWrapper } from "./FormItemWrapper";
import { useState, useEffect } from "react";
import Link from "next/link";
import { SafetyOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { PasswordStrength } from "../../common/PasswordStrength";

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
    // setValue, // <-- important to update form state
    watch,
  } = formState;

  // Local state ONLY for UI validation
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [termsError, setTermsError] = useState("");

  // Watch password for validation
  const passwordValue = watch("password");

  // Validate confirm password on change
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
    <div className="">
      <h3 className="text-2xl font-semibold mb-4">Finalize Account</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Set your account credentials and accept the terms & privacy policy.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {/* Email (editable now) */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              Email
              <Tooltip title="This email will be used for login and account recovery. Make sure it's an email you have access to">
                <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
              </Tooltip>
            </span>
          }
          error={errors.email?.message}
        >
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="email"
                placeholder="Enter your email"
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            )}
          />
        </FormItemWrapper>

        {/* Password */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              Password
              <Tooltip title="Create a strong password with at least 8 characters, including uppercase, lowercase, numbers, and special characters">
                <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
              </Tooltip>
            </span>
          }
          error={errors.password?.message}
        >
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <>
                <Input.Password
                  {...field}
                  placeholder="Enter password"
                  className="rounded-lg bg-input text-foreground border-border"
                />
                {/* Password Strength Component */}
                <PasswordStrength password={field.value} className="mt-2" />
              </>
            )}
          />
        </FormItemWrapper>

        {/* Confirm Password (UI-only) */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              Confirm Password
              <Tooltip title="Re-enter your password to ensure it matches and avoid typos">
                <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
              </Tooltip>
            </span>
          }
          error={confirmError}
        >
          <Input.Password
            value={confirmPassword}
            placeholder="Confirm password"
            onChange={(e) => handleConfirmChange(e.target.value)}
            className="rounded-lg bg-input text-foreground border-border"
          />
        </FormItemWrapper>

        {/* Terms & Privacy (UI-only) */}
        <FormItemWrapper label="" error={termsError}>
          <div className="flex items-start gap-2">
            <Checkbox
              checked={acceptTerms}
              onChange={(e) => handleTermsChange(e.target.checked)}
              className="mt-0.5"
            >
              <span className="text-foreground">
                I have read and agree to the{" "}
              </span>
              <Link
                href="/terms-and-conditions"
                className="underline text-badge hover:text-ring"
              >
                Terms & Conditions
              </Link>{" "}
              <span className="text-foreground">and </span>
              <Link
                href="/privacy-policy"
                className="underline text-badge hover:text-ring"
              >
                Privacy Policy
              </Link>
              .
            </Checkbox>
            <Tooltip title="You must accept our Terms & Conditions and Privacy Policy to create an account">
              <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help mt-1" />
            </Tooltip>
          </div>
        </FormItemWrapper>
      </div>
      <div className="flex items-start space-x-3 mt-4 p-4 bg-muted rounded-lg border border-border">
        <div className="shrink-0 text-emerald-600">
          <SafetyOutlined className="text-xl" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">
            Credentials & Privacy
          </h4>
          <p className="text-sm text-muted-foreground">
            Your account information is securely encrypted and stored. We
            respect your privacy and never share your credentials or personal
            data with third parties without consent.
          </p>
        </div>
      </div>
    </div>
  );
}
