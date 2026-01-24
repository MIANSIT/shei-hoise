"use client";

import { Button } from "antd";
import { useForm, Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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

import UserInformation from "@/app/components/onboarding/createStore/UserInformation";
import StoreInformation from "@/app/components/onboarding/createStore/StoreInformation";
import FinalizeAccount from "@/app/components/onboarding/createStore/FinalizeAccount";
import StoreSettings from "@/app/components/onboarding/createStore/StoreSettings";
import TermsPrivacy from "@/app/components/onboarding/createStore/TermsPrivacy";

interface StoreCreateFormProps {
  onSubmit: (data: CreateUserType, resetForm: () => void) => Promise<void>;
  loading?: boolean;
}

export default function StoreCreateForm({
  onSubmit,
  loading = false,
}: StoreCreateFormProps) {
  const [isFinalStepValid, setIsFinalStepValid] = useState(false);
  const notify = useSheiNotification();

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
        shipping_fees: [{ name: "Inside Dhaka", price: 1, estimated_days: 1 }],
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
      title: "User Info",
      content: <UserInformation control={control} formState={form} />,
      fields: [
        "user_type",
        "email",
        "first_name",
        "last_name",
        "phone",
        "profile.country",
        "profile.city",
      ] as Path<CreateUserType>[],
    },
    {
      title: "Store Info",
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
        "store.business_license",
        "store.tax_id",
      ] as Path<CreateUserType>[],
    },
    {
      title: "Store Settings",
      content: <StoreSettings control={control} />,
      fields: [
        "store_settings.currency",
        "store_settings.tax_rate",
        "store_settings.shipping_fees",
        "store_settings.processing_time_days",
        "store_settings.return_policy_days",
      ] as Path<CreateUserType>[],
    },
    {
      title: "Terms & Privacy",
      content: <TermsPrivacy control={control} />,
      fields: [
        "store_settings.terms_and_conditions",
        "store_settings.privacy_policy",
      ] as Path<CreateUserType>[],
    },
    {
      title: "Finalize Account",
      content: (
        <FinalizeAccount
          control={control}
          formState={form}
          onValidationChange={setIsFinalStepValid}
        />
      ),
      fields: ["email", "password"] as Path<CreateUserType>[],
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
      notify.error("Please fix validation errors before proceeding");
      return;
    }
    next();
  };

  const handleStepClick = async (stepIndex: number) => {
    if (stepIndex < currentStep) goTo(stepIndex);
    else if (stepIndex === currentStep) return;
    else {
      const isStepValid = await trigger(currentFields, { shouldFocus: true });
      if (isStepValid) goTo(stepIndex);
      else notify.error("Please fix validation errors before proceeding");
    }
  };

  const onSubmitForm = (data: CreateUserType) => {
    if (!isFinalStepValid) {
      notify.error("Please complete password confirmation and accept terms");
      return;
    }
    onSubmit(data, reset);
  };

  return (
    <div className="flex w-full flex-1 max-w-5xl gap-4 md:gap-6">
      {/* Mobile Sidebar */}
      <div className="flex md:hidden flex-col items-center sticky top-4 h-fit">
        {steps.map((step, idx) => (
          <div key={idx} className="flex flex-col items-center mb-4">
            <button
              onClick={() => handleStepClick(idx)}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors duration-200
                ${
                  currentStep === idx
                    ? "bg-blue-500 text-white"
                    : idx < currentStep
                      ? "bg-blue-200 text-blue-600"
                      : "bg-gray-200 text-gray-500"
                }`}
            >
              {idx + 1}
            </button>
            {idx < steps.length - 1 && (
              <div
                className={`w-1 h-8 ${idx < currentStep ? "bg-blue-500" : "bg-gray-200"}`}
              ></div>
            )}
          </div>
        ))}
      </div>

      {/* Scrollable Form */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-8rem)] bg-card shadow-lg rounded-xl p-6">
        {currentContent}

        <div className="mt-6 flex justify-between items-center">
          {!isFirst && (
            <Button onClick={prev} type="default">
              Previous
            </Button>
          )}

          <div className="flex-1 flex justify-end">
            {!isLast ? (
              <Button type="primary" onClick={handleNext} htmlType="button">
                Next
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleSubmit(onSubmitForm)}
                loading={loading}
                disabled={!isFinalStepValid}
                className="rounded-lg px-6 py-2 font-semibold transition-colors duration-200"
                style={{ backgroundColor: "var(--chart-2)", border: "none" }}
                onMouseEnter={(e) =>
                  ((
                    e.currentTarget as HTMLButtonElement
                  ).style.backgroundColor = "var(--badge)")
                }
                onMouseLeave={(e) =>
                  ((
                    e.currentTarget as HTMLButtonElement
                  ).style.backgroundColor = "var(--chart-2)")
                }
              >
                Request Onboard
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
