"use client";

import { Input, Divider, Tooltip } from "antd";
import { Controller, Control, UseFormReturn } from "react-hook-form";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import { FormItemWrapper } from "./FormItemWrapper";
import { SafetyOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "@/lib/hook/useTranslation";

interface Props {
  control: Control<CreateUserType>;
  formState: UseFormReturn<CreateUserType>;
}

export default function UserInformation({ control, formState }: Props) {
  const { errors } = formState.formState;
  const t = useTranslation();

  return (
    <div className="">
      <h3 className="text-2xl font-semibold mb-4">{t.onboarding.userInfoTitle}</h3>
      <p className="text-sm text-muted-foreground mb-4">{t.onboarding.userInfoSubtitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* First Name */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              {t.onboarding.firstName}
              <Tooltip title={t.onboarding.firstNameTip}>
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
                placeholder={t.onboarding.firstNamePlaceholder}
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            )}
          />
        </FormItemWrapper>

        {/* Last Name */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              {t.onboarding.lastName}
              <Tooltip title={t.onboarding.lastNameTip}>
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
                placeholder={t.onboarding.lastNamePlaceholder}
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            )}
          />
        </FormItemWrapper>

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
                placeholder={t.onboarding.emailPlaceholder}
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            )}
          />
        </FormItemWrapper>

        {/* Phone */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              {t.onboarding.phone}
              <Tooltip title={t.onboarding.phoneTip}>
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
                placeholder={t.onboarding.phonePlaceholder}
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            )}
          />
        </FormItemWrapper>

        {/* City */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              {t.onboarding.city}
              <Tooltip title={t.onboarding.cityTip}>
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
                placeholder={t.onboarding.cityPlaceholder}
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            )}
          />
        </FormItemWrapper>

        {/* Country */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              {t.onboarding.country}
              <Tooltip title={t.onboarding.countryTip}>
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

      <Divider className="my-4 border-border" />

      <div className="flex items-start space-x-3 mt-4 p-4 bg-muted rounded-lg">
        <div className="shrink-0 text-emerald-600">
          <SafetyOutlined className="text-xl" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{t.onboarding.securityTitle}</h4>
          <p className="text-sm text-muted-foreground">{t.onboarding.securityDesc}</p>
        </div>
      </div>
    </div>
  );
}
