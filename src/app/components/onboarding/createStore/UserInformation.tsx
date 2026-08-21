"use client";

import { Checkbox } from "antd";
import { Controller, Control, UseFormReturn } from "react-hook-form";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import { PillField, PillShell } from "../../common/PillField";
import { PasswordField } from "../../common/PasswordField";
import { PasswordStrength } from "../../common/PasswordStrength";
import { CountryFlag } from "../../common/CountryFlag";
import { useTranslation } from "@/lib/hook/useTranslation";

export type AccountValidationReason =
  | "confirm_required"
  | "confirm_mismatch"
  | "terms_required"
  | null;

interface Props {
  control: Control<CreateUserType>;
  formState: UseFormReturn<CreateUserType>;
  onValidationChange?: (isValid: boolean, reason: AccountValidationReason) => void;
  // Bumped by the parent every time a submit is attempted while this step is
  // invalid, so untouched fields reveal their error instead of staying blank.
  validationAttempt?: number;
}

export default function UserInformation({
  control,
  formState,
  onValidationChange,
  validationAttempt = 0,
}: Props) {
  const { errors } = formState.formState;
  const { watch } = formState;
  const t = useTranslation();

  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [termsError, setTermsError] = useState("");

  const passwordValue = watch("password");

  const handleConfirmChange = (value: string) => {
    setConfirmPassword(value);
    if (value && value !== passwordValue) {
      setConfirmError(t.onboarding.passwordMismatch);
    } else {
      setConfirmError("");
    }
  };

  const handleTermsChange = (checked: boolean) => {
    setAcceptTerms(checked);
    setTermsError(checked ? "" : t.onboarding.mustAcceptTerms);
  };

  useEffect(() => {
    const reason: AccountValidationReason = !confirmPassword
      ? "confirm_required"
      : confirmPassword !== passwordValue
      ? "confirm_mismatch"
      : !acceptTerms
      ? "terms_required"
      : null;

    onValidationChange?.(reason === null, reason);
  }, [confirmPassword, passwordValue, acceptTerms, onValidationChange]);

  useEffect(() => {
    if (confirmPassword && confirmPassword !== passwordValue) {
      setConfirmError(t.onboarding.passwordMismatch);
    } else if (confirmPassword) {
      setConfirmError("");
    }
  }, [passwordValue, confirmPassword, t.onboarding.passwordMismatch]);

  // Forces the specific, untouched field to reveal its error the moment the
  // parent rejects a submit attempt — otherwise a field the user never
  // interacted with stays silently blank while the button just does nothing.
  useEffect(() => {
    if (!validationAttempt) return;
    if (!confirmPassword) {
      setConfirmError(t.onboarding.confirmPasswordRequired);
    } else if (confirmPassword !== passwordValue) {
      setConfirmError(t.onboarding.passwordMismatch);
    }
    if (!acceptTerms) {
      setTermsError(t.onboarding.mustAcceptTerms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationAttempt]);

  return (
    <div className="">
      <h3 className="text-2xl font-semibold mb-1">{t.onboarding.userInfoTitle}</h3>
      <p className="text-sm text-muted-foreground mb-6">{t.onboarding.userInfoSubtitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
        <Controller
          name="first_name"
          control={control}
          render={({ field }) => (
            <PillField
              id="first_name"
              label={t.onboarding.firstName}
              value={field.value}
              onChange={field.onChange}
              placeholder={t.onboarding.firstNamePlaceholder}
              required
              tooltip={t.onboarding.firstNameTip}
              error={errors.first_name?.message}
            />
          )}
        />

        <Controller
          name="last_name"
          control={control}
          render={({ field }) => (
            <PillField
              id="last_name"
              label={t.onboarding.lastName}
              value={field.value}
              onChange={field.onChange}
              placeholder={t.onboarding.lastNamePlaceholder}
              required
              tooltip={t.onboarding.lastNameTip}
              error={errors.last_name?.message}
            />
          )}
        />

        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <PillField
              id="phone"
              type="tel"
              label={t.onboarding.phone}
              value={field.value}
              onChange={field.onChange}
              placeholder={t.onboarding.phonePlaceholder}
              required
              tooltip={t.onboarding.phoneTip}
              error={errors.phone?.message}
            />
          )}
        />

        <Controller
          name="profile.country"
          control={control}
          render={({ field }) => (
            <PillShell label={t.onboarding.country} tooltip={t.onboarding.countryTip}>
              <CountryFlag
                value={field.value || "Bangladesh"}
                onValueChange={field.onChange}
                lockToCountry="Bangladesh"
                className="h-12 w-full rounded-full border-0 bg-transparent px-4 shadow-none focus-visible:ring-0"
              />
            </PillShell>
          )}
        />
      </div>

      <div className="my-8 h-px bg-chart-2/15" />

      <h4 className="text-lg font-semibold mb-1">{t.onboarding.finalizeTitle}</h4>
      <p className="text-sm text-muted-foreground mb-6">{t.onboarding.finalizeSubtitle}</p>

      <div className="grid grid-cols-1 gap-6">
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <PillField
              id="email"
              type="email"
              label={t.onboarding.email}
              value={field.value}
              onChange={field.onChange}
              placeholder={t.onboarding.emailPlaceholder}
              required
              tooltip={t.onboarding.emailTip}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <div>
              <PasswordField
                id="password"
                label={t.onboarding.password}
                value={field.value}
                onChange={field.onChange}
                placeholder={t.onboarding.passwordPlaceholder}
                required
                tooltip={t.onboarding.passwordTip}
                error={errors.password?.message}
              />
              <PasswordStrength password={field.value} className="mt-3 px-1" />
            </div>
          )}
        />

        <PasswordField
          id="confirm_password"
          label={t.onboarding.confirmPassword}
          value={confirmPassword}
          onChange={handleConfirmChange}
          placeholder={t.onboarding.confirmPasswordPlaceholder}
          required
          tooltip={t.onboarding.confirmPasswordTip}
          error={confirmError}
        />

        <div>
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
          </div>
          {termsError && (
            <p className="mt-1 ml-4 text-xs text-destructive">{termsError}</p>
          )}
        </div>
      </div>

      <div className="flex items-start space-x-3 mt-6 p-4 bg-chart-2/5 rounded-2xl border border-chart-2/15">
        <div className="shrink-0 text-chart-2">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{t.onboarding.credentialsTitle}</h4>
          <p className="text-sm text-muted-foreground">{t.onboarding.credentialsDesc}</p>
        </div>
      </div>
    </div>
  );
}
