"use client";

import { Input, Checkbox, Tooltip } from "antd";
import { Controller, Control, UseFormReturn } from "react-hook-form";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import { FormItemWrapper } from "./FormItemWrapper";
import { useState, useEffect } from "react";
import Link from "next/link";
import { SafetyOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { PasswordStrength } from "../../common/PasswordStrength";
import { useTranslation } from "@/lib/hook/useTranslation";

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
    watch,
  } = formState;

  const t = useTranslation();

  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [termsError, setTermsError] = useState("");

  const passwordValue = watch("password");

  const handleConfirmChange = (value: string) => {
    setConfirmPassword(value);
    if (value !== passwordValue) {
      setConfirmError(t.onboarding.passwordMismatch);
    } else {
      setConfirmError("");
    }
  };

  const handleTermsChange = (checked: boolean) => {
    setAcceptTerms(checked);
    if (!checked) {
      setTermsError(t.onboarding.mustAcceptTerms);
    } else {
      setTermsError("");
    }
  };

  useEffect(() => {
    const isValid = confirmPassword === passwordValue && acceptTerms;
    if (onValidationChange) {
      onValidationChange(isValid);
    }
  }, [confirmPassword, passwordValue, acceptTerms, onValidationChange]);

  useEffect(() => {
    if (confirmPassword && confirmPassword !== passwordValue) {
      setConfirmError(t.onboarding.passwordMismatch);
    } else if (confirmPassword) {
      setConfirmError("");
    }
  }, [passwordValue, confirmPassword, t.onboarding.passwordMismatch]);

  return (
    <div className="">
      <h3 className="text-2xl font-semibold mb-4">{t.onboarding.finalizeTitle}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t.onboarding.finalizeSubtitle}
      </p>

      <div className="grid grid-cols-1 gap-4">
        {/* Email */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              {t.onboarding.email}
              <Tooltip title={t.onboarding.emailTip}>
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
                placeholder={t.onboarding.emailPlaceholder}
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            )}
          />
        </FormItemWrapper>

        {/* Password */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              {t.onboarding.password}
              <Tooltip title={t.onboarding.passwordTip}>
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
                  placeholder={t.onboarding.passwordPlaceholder}
                  className="rounded-lg bg-input text-foreground border-border"
                />
                <PasswordStrength password={field.value} className="mt-2" />
              </>
            )}
          />
        </FormItemWrapper>

        {/* Confirm Password */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              {t.onboarding.confirmPassword}
              <Tooltip title={t.onboarding.confirmPasswordTip}>
                <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
              </Tooltip>
            </span>
          }
          error={confirmError}
        >
          <Input.Password
            value={confirmPassword}
            placeholder={t.onboarding.confirmPasswordPlaceholder}
            onChange={(e) => handleConfirmChange(e.target.value)}
            className="rounded-lg bg-input text-foreground border-border"
          />
        </FormItemWrapper>

        {/* Terms & Privacy */}
        <FormItemWrapper label="" error={termsError}>
          <div className="flex items-start gap-2">
            <Checkbox
              checked={acceptTerms}
              onChange={(e) => handleTermsChange(e.target.checked)}
              className="mt-0.5"
            >
              <span className="text-foreground">
                {t.onboarding.agreeText}{" "}
              </span>
              <Link
                href="/terms-and-conditions"
                className="underline text-badge hover:text-ring"
              >
                {t.onboarding.termsLink}
              </Link>{" "}
              <span className="text-foreground">{t.onboarding.andText} </span>
              <Link
                href="/privacy-policy"
                className="underline text-badge hover:text-ring"
              >
                {t.onboarding.privacyLink}
              </Link>
              .
            </Checkbox>
            <Tooltip title={t.onboarding.mustAcceptTerms}>
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
            {t.onboarding.credentialsTitle}
          </h4>
          <p className="text-sm text-muted-foreground">
            {t.onboarding.credentialsDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
