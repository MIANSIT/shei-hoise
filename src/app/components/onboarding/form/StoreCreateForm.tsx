"use client";

import { Button, Steps } from "antd";
import { Path, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  CreateUserType,
  createUserSchema,
} from "@/lib/schema/onboarding/user.schema";
import { Currency, StoreStatus, USER_TYPES } from "@/lib/types/enums";
import {
  useStepForm,
  Step as StepType,
} from "@/lib/hook/onboarding/useStepForm";

import UserInformation from "@/app/components/onboarding/createStore/UserInformation";
import StoreInformation from "@/app/components/onboarding/createStore/StoreInformation";
import StoreContactInfo from "@/app/components/onboarding/createStore/StoreContactInfo";
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
  const form = useForm<CreateUserType>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      phone: "",
      user_type: USER_TYPES.STORE_OWNER,
      is_active: true,
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
        shipping_fees: [{ name: "Inside Dhaka", price: 0 }],
        min_order_amount: 0,
        processing_time_days: 1,
        return_policy_days: 7,
        terms_and_conditions: "",
        privacy_policy: "",
      },
      profile: { country: "Bangladesh" },
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
        "password",
        "first_name",
        "last_name",
        "phone",
        "profile.country",
      ] as Path<CreateUserType>[],
    },
    {
      title: "Store Info",
      content: <StoreInformation control={control} />,
      fields: [
        "store.store_name",
        "store.store_slug",
        "store.logo_url",
        "store.banner_url",
      ] as Path<CreateUserType>[],
    },
    {
      title: "Store Contact",
      content: <StoreContactInfo control={control} />,
      fields: [
        "store.contact_email",
        "store.contact_phone",
        "store.business_address",
      ] as Path<CreateUserType>[],
    },
    {
      title: "Store Settings",
      content: <StoreSettings control={control} />,
      fields: [
        "store_settings.tax_rate",
        "store_settings.min_order_amount",
        "store_settings.shipping_fees",
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
    const valid = await trigger(currentFields, { shouldFocus: true });
    if (!valid) return;
    next();
  };

  const onSubmitForm = (data: CreateUserType) => {
    onSubmit(data, reset);
  };

  // AntD v5 Steps items
  const items = steps.map((step, index) => ({
    key: step.title,
    title: step.title,
    onClick: () => goTo(index), // Clickable step
  }));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6">Create Store</h2>

      <Steps current={currentStep} items={items} className="mb-6" />

      <div className="p-6 bg-white shadow-lg rounded-xl mb-6">
        {currentContent}
      </div>

      <div className="flex justify-between">
        {!isFirst && (
          <Button onClick={prev} type="default">
            Previous
          </Button>
        )}

        {!isLast ? (
          <Button type="primary" onClick={handleNext} htmlType="button">
            Next
          </Button>
        ) : (
          <Button
            type="primary"
            onClick={handleSubmit(onSubmitForm)}
            loading={loading}
            htmlType="button"
          >
            Submit
          </Button>
        )}
      </div>
    </div>
  );
}
