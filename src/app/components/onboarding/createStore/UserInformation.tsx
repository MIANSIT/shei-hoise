"use client";

import { Input, Divider, Tooltip } from "antd";
import { Controller, Control, UseFormReturn } from "react-hook-form";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import { FormItemWrapper } from "./FormItemWrapper";
import { SafetyOutlined, InfoCircleOutlined } from "@ant-design/icons";

interface Props {
  control: Control<CreateUserType>;
  formState: UseFormReturn<CreateUserType>;
}

export default function UserInformation({ control, formState }: Props) {
  const { errors } = formState.formState;

  return (
    <div className="">
      {/* Section Title */}
      <h3 className="text-2xl font-semibold mb-4">User Information</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Fill in your personal details. Your data is secure and private.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* First Name */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              First Name
              <Tooltip title="Enter your legal first name as it appears on official documents">
                <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
              </Tooltip>
            </span>
          }
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
          label={
            <span className="text-foreground flex items-center gap-1">
              Last Name
              <Tooltip title="Enter your legal last name (surname/family name)">
                <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
              </Tooltip>
            </span>
          }
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
          label={
            <span className="text-foreground flex items-center gap-1">
              Email
              <Tooltip title="Enter a valid email address for account Creation and notifications">
                <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
              </Tooltip>
            </span>
          }
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
          label={
            <span className="text-foreground flex items-center gap-1">
              Phone Number
              <Tooltip title="Enter your primary contact number (e.g., 018772211121)">
                <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
              </Tooltip>
            </span>
          }
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
          label={
            <span className="text-foreground flex items-center gap-1">
              City
              <Tooltip title="Enter the city where you currently reside">
                <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
              </Tooltip>
            </span>
          }
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
          label={
            <span className="text-foreground flex items-center gap-1">
              Country
              <Tooltip title="Your country is auto-detected and cannot be changed">
                <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
              </Tooltip>
            </span>
          }
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
        <div className="shrink-0 text-emerald-600">
          <SafetyOutlined className="text-xl" />
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
