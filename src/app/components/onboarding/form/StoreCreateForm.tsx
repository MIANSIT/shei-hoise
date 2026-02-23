"use client";

import { Button } from "antd";
import { Path, useForm } from "react-hook-form";
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
        shipping_fees: [
          {
            name: "Inside Dhaka",
            price: 0, // or you can use null/undefined if you adjust the schema
            estimated_days: "",
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
      notify.error("Please Fill Up the required fields to proceed");
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
      else notify.error("Please Fill Up the required fields to proceed");
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
    <div className='max-w-5xl mx-auto p-4 md:p-6 flex flex-col md:flex-col'>
      {/* Desktop: Top Horizontal Steps with Names */}
      <div className='hidden md:flex mb-6 justify-between items-center'>
        {steps.map((step, idx) => (
          <div key={idx} className='flex-1 flex items-center'>
            {/* Circle */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
            ${
              currentStep === idx
                ? "bg-blue-500 text-white"
                : idx < currentStep
                ? "bg-blue-200 text-blue-600"
                : "bg-gray-200 text-gray-500"
            }
          `}
            >
              {idx + 1}
            </div>
            {/* Step Name */}
            <span
              className={`ml-2 font-medium text-sm
          ${
            currentStep === idx
              ? "text-blue-500"
              : idx < currentStep
              ? "text-blue-600"
              : "text-gray-500"
          }
        `}
            >
              {step.title}
            </span>

            {/* Line */}
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2
            ${idx < currentStep ? "bg-blue-500" : "bg-gray-200"}
          `}
              ></div>
            )}
          </div>
        ))}
      </div>

      <div className='flex flex-1 items-center'>
        {/* Mobile: Vertical Sidebar with line & numbers */}
        <div className='flex md:hidden flex-col items-center mr-4 top-4 h-screen'>
          {" "}
          {steps.map((step, idx) => (
            <div key={idx} className='flex flex-col items-center mb-4'>
              {/* Circle */}
              <button
                onClick={() => handleStepClick(idx)}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors duration-200
              ${
                currentStep === idx
                  ? "bg-blue-500 text-white"
                  : idx < currentStep
                  ? "bg-blue-200 text-blue-600"
                  : "bg-gray-200 text-gray-500"
              }
            `}
              >
                {idx + 1}
              </button>

              {/* Line below circle */}
              {idx < steps.length - 1 && (
                <div
                  className={`w-1 h-8
              ${idx < currentStep ? "bg-blue-500" : "bg-gray-200"}
            `}
                ></div>
              )}
            </div>
          ))}
        </div>

        {/* Form Content */}
        <div className='flex-1 bg-card shadow-lg rounded-xl p-6'>
          {currentContent}

          {/* Navigation Buttons */}
          <div className='mt-6 flex justify-between items-center'>
            {!isFirst && (
              <Button onClick={prev} type='default'>
                Previous
              </Button>
            )}

            <div className='flex-1 flex justify-end'>
              {!isLast ? (
                <Button type='primary' onClick={handleNext} htmlType='button'>
                  Next
                </Button>
              ) : (
                <Button
                  type='primary'
                  onClick={handleSubmit(onSubmitForm)}
                  loading={loading}
                  disabled={!isFinalStepValid}
                  className='rounded-lg px-6 py-2 font-semibold transition-colors duration-200'
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
                  Request Onboard
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
