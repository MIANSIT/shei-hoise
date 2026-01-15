"use client";

import { Input, Divider } from "antd";
import { Controller, Control, UseFormReturn } from "react-hook-form";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import { FormItemWrapper } from "./FormItemWrapper";
import { SafetyOutlined } from "@ant-design/icons";

interface Props {
  control: Control<CreateUserType>;
  formState: UseFormReturn<CreateUserType>;
}

export default function UserInformation({ control, formState }: Props) {
  const { errors } = formState.formState;

  return (
    <div className="bg-card text-card-foreground shadow-md rounded-xl p-6 border">
      {/* Section Title */}
      <h3 className="text-2xl font-semibold mb-4">User Information</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Fill in your personal details. Your data is secure and private.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* First Name */}
        <FormItemWrapper
          label={<span className="text-foreground">First Name</span>}
          required
          error={errors.first_name}
        >
          <Controller
            name="first_name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Enter your first name"
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            )}
          />
        </FormItemWrapper>

        {/* Last Name */}
        <FormItemWrapper
          label={<span className="text-foreground">Last Name</span>}
          required
          error={errors.last_name}
        >
          <Controller
            name="last_name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Enter your last name"
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            )}
          />
        </FormItemWrapper>

        {/* Email */}
        <FormItemWrapper
          label={<span className="text-foreground">Email</span>}
          required
          error={errors.email}
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

        {/* Phone */}
        <FormItemWrapper
          label={<span className="text-foreground">Phone Number</span>}
          required
          error={errors.phone}
        >
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="tel"
                placeholder="Enter your phone number"
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            )}
          />
        </FormItemWrapper>

        {/* City */}
        <FormItemWrapper
          label={<span className="text-foreground">City</span>}
          error={errors.profile?.city}
        >
          <Controller
            name="profile.city"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Enter your city"
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            )}
          />
        </FormItemWrapper>

        {/* Country */}
        <FormItemWrapper
          label={<span className="text-foreground">Country</span>}
          error={errors.profile?.country}
        >
          <Controller
            name="profile.country"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                readOnly
                className="rounded-lg bg-input text-foreground border-border cursor-not-allowed"
              />
            )}
          />
        </FormItemWrapper>
      </div>

      {/* Security & Data Section */}
      <Divider className="my-4 border-border" />

      <div className="flex items-start space-x-3 mt-4 p-4 bg-muted rounded-lg">
        <div className="shrink-0">
          <SafetyOutlined />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">Security & Data</h4>
          <p className="text-sm text-muted-foreground">
            Your personal information is encrypted and stored securely. We
            respect your privacy and do not share your data with third parties
            without consent.
          </p>
        </div>
      </div>
    </div>
  );
}
