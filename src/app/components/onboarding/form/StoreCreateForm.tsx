"use client";

import { Button } from "antd";
import { Path, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";

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
        description: "",
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
        shipping_fees: [
          {
            name: "Inside Dhaka",
            price: 0,
            estimated_days: "3-5",
          },
        ],
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

  const { control, handleSubmit, trigger, reset } = form;

  const stepsList: StepType[] = [
    {
      title: t.onboarding.stepStoreInfo,
      content: <StoreInformation control={control} />,
      fields: [
        "store.store_name",
        "store.store_slug",
        "store.description",
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

  const handleNext = async () => {
    if (!currentFields || currentFields.length === 0) return;
    const isStepValid = await trigger(currentFields, { shouldFocus: true });
    if (!isStepValid) {
      notify.error(t.onboarding.fillRequired);
      return;
    }
    next();
  };

  const handleStepClick = async (stepIndex: number) => {
    if (stepIndex < currentStep) {
      goTo(stepIndex);
    } else if (stepIndex === currentStep) {
      return;
    } else {
      const isStepValid = await trigger(currentFields, { shouldFocus: true });
      if (isStepValid) goTo(stepIndex);
      else notify.error(t.onboarding.fillRequired);
    }
  };

  const reasonMessages: Record<Exclude<AccountValidationReason, null>, string> = {
    confirm_required: t.onboarding.confirmPasswordRequired,
    confirm_mismatch: t.onboarding.passwordMismatch,
    terms_required: t.onboarding.mustAcceptTerms,
  };

  const onSubmitForm = (data: CreateUserType) => {
    if (!isAccountStepValid) {
      setAccountValidationAttempt((count) => count + 1);
      notify.error(
        accountValidationReason
          ? reasonMessages[accountValidationReason]
          : t.onboarding.completePassword,
      );
      return;
    }
    onSubmit(data, reset);
  };

  return (
    <div className='mx-auto flex w-full max-w-2xl flex-col p-4 md:p-6'>
      {/* Trust strip */}
      <div className='mb-6 flex items-center justify-center gap-2 text-xs text-muted-foreground'>
        <ShieldCheck className='h-3.5 w-3.5 text-chart-2' />
        <span>{t.onboarding.trustStrip}</span>
      </div>

      {/* Step indicator — centered on every breakpoint */}
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
      <div className='rounded-3xl border border-chart-2/10 bg-card p-6 shadow-xl md:p-10'>
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
                className='rounded-full px-8 font-semibold'
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
                className='rounded-full px-8 py-2 font-semibold transition-colors duration-200'
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
                {t.onboarding.requestOnboard}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
