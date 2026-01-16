"use client";

import { Button, Steps } from "antd";
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
        shipping_fees: [{ name: "Inside Dhaka", price: 1, estimated_days: 1 }],
        min_order_amount: 0,
        processing_time_days: 1,
        return_policy_days: 7,
        terms_and_conditions: "",
        privacy_policy: "",
      },
      profile: { country: "Bangladesh" },
      is_active: true,
    },
  });

  const { control, handleSubmit, trigger, reset } = form;

  // Step definitions
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
      fields: [
        "email",
        "password",
        // REMOVED: password_confirmation and accept_terms - they're UI-only now
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

  // Validate current step fields before moving next
  const handleNext = async () => {
    if (!currentFields || currentFields.length === 0) return;

    // Trigger validation for only current step fields
    const isStepValid = await trigger(currentFields, { shouldFocus: true });

    if (!isStepValid) {
      notify.error("Please fix validation errors before proceeding");
      return;
    }

    next();
  };

  const handleStepClick = async (stepIndex: number) => {
    if (stepIndex < currentStep) {
      // allow going back freely
      goTo(stepIndex);
    } else if (stepIndex === currentStep) {
      return;
    } else {
      // trying to jump forward -> validate current step first
      const isStepValid = await trigger(currentFields, { shouldFocus: true });
      if (isStepValid) {
        goTo(stepIndex);
      } else {
        notify.error("Please fix validation errors before proceeding");
      }
    }
  };

  const onSubmitForm = (data: CreateUserType) => {
    // Final validation check
    if (!isFinalStepValid) {
      notify.error("Please complete password confirmation and accept terms");
      return;
    }

    console.log("Submitting form", data);
    onSubmit(data, reset);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6">Create Store</h2>

      {/* Steps */}
      <Steps
        current={currentStep}
        onChange={handleStepClick}
        items={steps.map((step) => ({
          key: step.title,
          title: step.title,
        }))}
        className="mb-6 "
      />

      {/* Current Step Content */}
      <div className="p-6 bg-card shadow-lg rounded-xl mt-6">
        {currentContent}

        {/* Navigation Buttons */}
        <div className="mt-6 flex justify-between items-center">
          {/* Previous button on the left */}
          {!isFirst && (
            <Button onClick={prev} type="default">
              Previous
            </Button>
          )}

          {/* Spacer to push Next / Submit button to the right */}
          <div className="flex-1 flex justify-end">
            {!isLast ? (
              <Button type="primary" onClick={handleNext} htmlType="button">
                Next
              </Button>
            ) : (
              <Button
                type="primary" // remove AntD primary styles
                onClick={handleSubmit(onSubmitForm)}
                loading={loading}
                htmlType="submit"
                disabled={!isFinalStepValid}
                className="rounded-lg px-6 py-2 font-semibold transition-colors duration-200"
                style={{
                  backgroundColor: "var(--chart-2)",

                  border: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "var(--badge)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "var(--chart-2)";
                }}
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
