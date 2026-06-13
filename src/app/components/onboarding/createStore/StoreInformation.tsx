"use client";

import { Divider, Input, Tooltip } from "antd";
import { Controller, Control } from "react-hook-form";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import UploadImage from "../uploads/UploadImage";
import { FormItemWrapper } from "./FormItemWrapper";
import { SafetyOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "@/lib/hook/useTranslation";

interface Props {
  control: Control<CreateUserType>;
}

export default function StoreInformation({ control }: Props) {
  const t = useTranslation();

  return (
    <div className="">
      <h3 className="text-2xl font-semibold mb-2">{t.onboarding.storeInfoTitle}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t.onboarding.storeInfoSubtitle}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Store Name */}
        <Controller
          name="store.store_name"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  {t.onboarding.storeName}
                  <Tooltip title={t.onboarding.storeNameTip}>
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              required
              error={fieldState.error?.message}
            >
              <Input
                {...field}
                placeholder={t.onboarding.storeNamePlaceholder}
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </FormItemWrapper>
          )}
        />

        {/* Store Slug */}
        <Controller
          name="store.store_slug"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  {t.onboarding.storeSlug}
                  <Tooltip title={t.onboarding.storeSlugTip}>
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              required
              error={fieldState.error?.message}
            >
              <Input
                {...field}
                placeholder={t.onboarding.storeSlugPlaceholder}
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </FormItemWrapper>
          )}
        />

        {/* Store Description */}
        <Controller
          name="store.description"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  {t.onboarding.storeDesc}
                  <Tooltip title={t.onboarding.storeDescTip}>
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              error={fieldState.error?.message}
              className="md:col-span-2"
            >
              <Input.TextArea
                {...field}
                rows={4}
                placeholder={t.onboarding.storeDescPlaceholder}
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring resize-none"
              />
            </FormItemWrapper>
          )}
        />

        {/* Store Logo */}
        <Controller
          name="store.logo_url"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  {t.onboarding.storeLogo}
                  <Tooltip title={t.onboarding.storeLogoTip}>
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              error={fieldState.error?.message}
            >
              <UploadImage
                field={field}
                label={<span className="text-foreground">{t.onboarding.uploadLogo}</span>}
              />
            </FormItemWrapper>
          )}
        />

        {/* Store Banner (Optional) */}
        <Controller
          name="store.banner_url"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  {t.onboarding.storeBanner}
                  <Tooltip title={t.onboarding.storeBannerTip}>
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              error={fieldState.error?.message}
            >
              <UploadImage
                field={field}
                label={<span className="text-foreground">{t.onboarding.uploadBanner}</span>}
              />
            </FormItemWrapper>
          )}
        />

        {/* Contact Email */}
        <Controller
          name="store.contact_email"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  {t.onboarding.contactEmail}
                  <Tooltip title={t.onboarding.contactEmailTip}>
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              required
              error={fieldState.error?.message}
            >
              <Input
                {...field}
                placeholder={t.onboarding.contactEmailPlaceholder}
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </FormItemWrapper>
          )}
        />

        {/* Contact Phone */}
        <Controller
          name="store.contact_phone"
          control={control}
          rules={{ required: "Contact Phone is required" }}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  {t.onboarding.contactPhone}
                  <Tooltip title={t.onboarding.contactPhoneTip}>
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              required
              error={fieldState.error?.message}
            >
              <Input
                {...field}
                type="tel"
                placeholder={t.onboarding.contactPhonePlaceholder}
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </FormItemWrapper>
          )}
        />

        {/* Business Address */}
        <Controller
          name="store.business_address"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  {t.onboarding.businessAddress}
                  <Tooltip title={t.onboarding.businessAddressTip}>
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              required
              error={fieldState.error?.message}
              className="md:col-span-2"
            >
              <Input.TextArea
                {...field}
                rows={4}
                placeholder={t.onboarding.businessAddressPlaceholder}
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring resize-none"
              />
            </FormItemWrapper>
          )}
        />

        {/* Business License */}
        <Controller
          name="store.business_license"
          control={control}
          render={({ field }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  {t.onboarding.businessLicense}
                  <Tooltip title={t.onboarding.businessLicenseTip}>
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
            >
              <Input
                {...field}
                placeholder={t.onboarding.businessLicensePlaceholder}
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </FormItemWrapper>
          )}
        />

        {/* Tax ID */}
        <Controller
          name="store.tax_id"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  {t.onboarding.taxId}
                  <Tooltip title={t.onboarding.taxIdTip}>
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              error={fieldState.error?.message}
            >
              <Input
                {...field}
                placeholder={t.onboarding.taxIdPlaceholder}
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </FormItemWrapper>
          )}
        />
      </div>

      <Divider className="my-4 border-border" />

      <div className="flex items-start space-x-3 mt-4 p-4 bg-muted rounded-lg">
        <div className="shrink-0 text-emerald-600">
          <SafetyOutlined className="text-xl" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{t.onboarding.storeSecureTitle}</h4>
          <p className="text-sm text-muted-foreground">
            {t.onboarding.storeSecureDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
