"use client";

import { Button } from "antd";
import { Path, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { AdminAuthIllustration } from "@/app/components/layout/auth/AdminAuthIllustration";

import {
  CreateUserType,
  createUserSchema,
} from "@/lib/schema/onboarding/user.schema";
import { Currency, StoreStatus, USER_TYPES } from "@/lib/types/enums";
import {
  useStepForm,
  Step as StepType,
} from "@/lib/hook/onboarding/useStepForm";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useTranslation } from "@/lib/hook/useTranslation";

import UserInformation, {
  AccountValidationReason,
} from "@/app/components/onboarding/createStore/UserInformation";
import StoreInformation from "@/app/components/onboarding/createStore/StoreInformation";
import VerifyEmail from "@/app/components/onboarding/createStore/VerifyEmail";

interface StoreCreateFormProps {
  onSubmit: (data: CreateUserType, resetForm: () => void) => Promise<void>;
  loading?: boolean;
}

export default function StoreCreateForm({
  onSubmit,
  loading = false,
}: StoreCreateFormProps) {
  const [isAccountStepValid, setIsAccountStepValid] = useState(false);
  const [accountValidationReason, setAccountValidationReason] =
    useState<AccountValidationReason>(null);
  const [accountValidationAttempt, setAccountValidationAttempt] = useState(0);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const notify = useSheiNotification();
  const t = useTranslation();

  const form = useForm<CreateUserType>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      phone: "",
      user_type: USER_TYPES.STORE_OWNER,
      store: {
        store_name: "",
        store_slug: "",
        short_description: "",
        status: StoreStatus.TRIAL,
        contact_email: "",
        contact_phone: "",
        business_address: "",
        business_license: "",
        tax_id: "",
        logo_url: "",
        banner_url: "",
      },
      store_settings: {
        currency: Currency.BDT,
        tax_rate: 0,
        // No default shipping method — a placeholder fee would mislead
        // customers before the merchant has set real shipping options.
        // They configure their own real shipping in the Complete Setup
        // wizard's Shipping step (embeds ShippingManager directly).
        shipping_fees: [],
        min_order_amount: 0,
        processing_time_days: 1,
        return_policy_days: 7,
        terms_and_conditions: "",
        privacy_policy: "",
        store_social_media: {
          facebook_link: "",
          instagram_link: "",
          youtube_link: "",
          twitter_link: "",
        },
      },
      profile: { country: "Bangladesh" },
      is_active: true,
    },
  });

  const { control, handleSubmit, trigger, reset, watch } = form;
  const email = watch("email");

  const USER_INFO_STEP = 1;

  const stepsList: StepType[] = [
    {
      title: t.onboarding.stepStoreInfo,
      content: <StoreInformation control={control} />,
      fields: [
        "store.store_name",
        "store.store_slug",
        "store.short_description",
        "store.logo_url",
        "store.banner_url",
        "store.contact_email",
        "store.contact_phone",
        "store.business_address",
      ] as Path<CreateUserType>[],
    },
    {
      title: t.onboarding.stepUserInfo,
      content: (
        <UserInformation
          control={control}
          formState={form}
          onValidationChange={(isValid, reason) => {
            setIsAccountStepValid(isValid);
            setAccountValidationReason(reason);
          }}
          validationAttempt={accountValidationAttempt}
        />
      ),
      fields: [
        "user_type",
        "email",
        "first_name",
        "last_name",
        "phone",
        "profile.country",
        "password",
      ] as Path<CreateUserType>[],
    },
    {
      title: t.onboarding.stepVerifyEmail,
      content: (
        <VerifyEmail email={email} onValidationChange={setIsEmailVerified} />
      ),
      fields: [] as Path<CreateUserType>[],
    },
  ];

  const {
    steps,
    currentStep,
    next,
    prev,
    goTo,
    isFirst,
    isLast,
    currentContent,
    currentFields,
  } = useStepForm(stepsList);

  const reasonMessages: Record<Exclude<AccountValidationReason, null>, string> = {
    confirm_required: t.onboarding.confirmPasswordRequired,
    confirm_mismatch: t.onboarding.passwordMismatch,
    terms_required: t.onboarding.mustAcceptTerms,
  };

  // Confirm-password and terms live as local state inside UserInformation
  // (not RHF fields), so trigger() alone never catches them — this is the
  // one shared gate both step navigation and final submit rely on.
  const blockedByAccountValidation = () => {
    if (isAccountStepValid) return false;
    setAccountValidationAttempt((count) => count + 1);
    notify.error(
      accountValidationReason
        ? reasonMessages[accountValidationReason]
        : t.onboarding.completePassword,
    );
    return true;
  };

  const handleNext = async () => {
    if (!currentFields || currentFields.length === 0) return;
    const isStepValid = await trigger(currentFields, { shouldFocus: true });
    if (!isStepValid) {
      notify.error(t.onboarding.fillRequired);
      return;
    }
    if (currentStep === USER_INFO_STEP && blockedByAccountValidation()) return;
    next();
  };

  const handleStepClick = async (stepIndex: number) => {
    if (stepIndex < currentStep) {
      goTo(stepIndex);
    } else if (stepIndex === currentStep) {
      return;
    } else {
      const isStepValid = await trigger(currentFields, { shouldFocus: true });
      if (!isStepValid) {
        notify.error(t.onboarding.fillRequired);
        return;
      }
      if (currentStep === USER_INFO_STEP && blockedByAccountValidation()) return;
      goTo(stepIndex);
    }
  };

  const onSubmitForm = (data: CreateUserType) => {
    if (blockedByAccountValidation()) return;
    if (!isEmailVerified) {
      notify.error(t.onboarding.verifyRequired);
      return;
    }
    onSubmit(data, reset);
  };

  const sidebarBullets = [
    t.onboarding.sidebarBullet1,
    t.onboarding.sidebarBullet2,
    t.onboarding.sidebarBullet3,
    t.onboarding.sidebarBullet4,
    t.onboarding.sidebarBullet5,
    t.onboarding.sidebarBullet6,
  ];

  return (
    <div className='mx-auto flex w-full max-w-6xl flex-col p-4 md:p-6'>
      {/* Trust strip */}
      <div className='mb-6 flex items-center justify-center gap-2 text-xs text-muted-foreground'>
        <ShieldCheck className='h-3.5 w-3.5 text-chart-2' />
        <span>
          {t.onboarding.trustStripPrefix}
          <span className='font-medium text-foreground'>{t.onboarding.trustStripBold}</span>
          {t.onboarding.trustStripSuffix}
        </span>
      </div>

      <div className='flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center'>
        <div className='flex w-full max-w-2xl flex-col items-center'>
          {/* Step indicator — centered above the form itself, not the whole row */}
          <div className='mb-8 flex items-center justify-center gap-3 sm:gap-4'>
            {steps.map((step, idx) => (
              <div key={idx} className='flex items-center gap-3 sm:gap-4'>
                <button
                  type='button'
                  onClick={() => handleStepClick(idx)}
                  className='flex flex-col items-center gap-2'
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-200 ${
                      currentStep === idx
                        ? "bg-chart-2 text-white ring-4 ring-chart-2/20"
                        : idx < currentStep
                        ? "border-2 border-chart-2 bg-chart-2/10 text-chart-2"
                        : "border-2 border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={`whitespace-nowrap text-xs font-medium ${
                      currentStep === idx
                        ? "text-chart-2"
                        : idx < currentStep
                        ? "text-chart-2/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                </button>

                {idx < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-12 rounded-full transition-colors duration-200 sm:w-24 ${
                      idx < currentStep ? "bg-chart-2" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Form Content */}
          <div className='w-full rounded-3xl border border-chart-2/10 bg-card p-6 shadow-2xl shadow-chart-2/10 md:p-10'>
            {currentContent}

            {/* Navigation Buttons */}
            <div className='mt-8 flex items-center justify-between'>
              {!isFirst && (
                <Button onClick={prev} type='default' className='rounded-full px-6'>
                  {t.onboarding.previous}
                </Button>
              )}

              <div className='flex-1 flex justify-end'>
                {!isLast ? (
                  <Button
                    type='primary'
                    onClick={handleNext}
                    htmlType='button'
                    className='rounded-full px-8 font-semibold shadow-lg shadow-chart-2/30'
                    style={{ backgroundColor: "var(--chart-2)", border: "none" }}
                    onMouseEnter={(e) => {
                      (
                        e.currentTarget as HTMLButtonElement
                      ).style.backgroundColor = "var(--badge)";
                    }}
                    onMouseLeave={(e) => {
                      (
                        e.currentTarget as HTMLButtonElement
                      ).style.backgroundColor = "var(--chart-2)";
                    }}
                  >
                    {t.onboarding.next}
                  </Button>
                ) : (
                  <Button
                    type='primary'
                    onClick={handleSubmit(onSubmitForm)}
                    loading={loading}
                    disabled={!isEmailVerified}
                    title={!isEmailVerified ? t.onboarding.verifyRequired : undefined}
                    className='rounded-full px-8 py-2 font-semibold shadow-lg shadow-chart-2/30 transition-colors duration-200'
                    style={
                      isEmailVerified
                        ? { backgroundColor: "var(--chart-2)", border: "none" }
                        : undefined
                    }
                    onMouseEnter={(e) => {
                      if (!isEmailVerified) return;
                      (
                        e.currentTarget as HTMLButtonElement
                      ).style.backgroundColor = "var(--badge)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isEmailVerified) return;
                      (
                        e.currentTarget as HTMLButtonElement
                      ).style.backgroundColor = "var(--chart-2)";
                    }}
                  >
                    {t.onboarding.requestOnboard}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Brand panel — desktop/wide screens only, fills the space beside the form */}
        <aside className='sticky top-6 hidden w-85 shrink-0 flex-col lg:order-first lg:flex'>
          <span className='text-xs font-bold uppercase tracking-widest text-chart-2'>
            {t.onboarding.sidebarEyebrow}
          </span>
          <h2 className='mt-2 text-2xl font-semibold text-foreground'>
            {t.onboarding.sidebarHeadline}
          </h2>
          <p className='mt-2 text-sm text-muted-foreground'>
            {t.onboarding.sidebarSubtext}
          </p>

          <ul className='mt-5 space-y-3'>
            {sidebarBullets.map((bullet) => (
              <li key={bullet} className='flex items-start gap-2 text-sm text-foreground'>
                <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-chart-2' />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <div className='mt-6 aspect-4/3 overflow-hidden rounded-3xl shadow-2xl shadow-chart-2/20 ring-1 ring-chart-2/15'>
            <AdminAuthIllustration />
          </div>
        </aside>
      </div>
    </div>
  );
}
