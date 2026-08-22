"use client";

import { Controller, Control } from "react-hook-form";
import { Info, ShieldCheck } from "lucide-react";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import UploadImage from "../uploads/UploadImage";
import { PillField, PillTextArea } from "../../common/PillField";
import { useTranslation } from "@/lib/hook/useTranslation";

interface Props {
  control: Control<CreateUserType>;
}

function UploadLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-chart-2">
      {label}
      <span title={tooltip} className="text-muted-foreground cursor-help">
        <Info size={12} />
      </span>
    </p>
  );
}

export default function StoreInformation({ control }: Props) {
  const t = useTranslation();

  return (
    <div className="">
      <h3 className="text-2xl font-semibold mb-1">{t.onboarding.storeInfoTitle}</h3>
      <p className="text-sm text-muted-foreground mb-6">
        {t.onboarding.storeInfoSubtitle}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
        <Controller
          name="store.store_name"
          control={control}
          render={({ field, fieldState }) => (
            <PillField
              id="store_name"
              label={t.onboarding.storeName}
              value={field.value}
              onChange={field.onChange}
              placeholder={t.onboarding.storeNamePlaceholder}
              required
              tooltip={t.onboarding.storeNameTip}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="store.store_slug"
          control={control}
          render={({ field, fieldState }) => (
            <PillField
              id="store_slug"
              label={t.onboarding.storeSlug}
              value={field.value}
              onChange={field.onChange}
              placeholder={t.onboarding.storeSlugPlaceholder}
              required
              tooltip={t.onboarding.storeSlugTip}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="store.short_description"
          control={control}
          render={({ field, fieldState }) => (
            <PillField
              id="store_short_description"
              label={t.onboarding.storeDesc}
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder={t.onboarding.storeDescPlaceholder}
              tooltip={t.onboarding.storeDescTip}
              error={fieldState.error?.message}
              maxLength={160}
              className="md:col-span-2"
            />
          )}
        />

        <Controller
          name="store.logo_url"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col items-center text-center">
              <UploadLabel label={t.onboarding.storeLogo} tooltip={t.onboarding.storeLogoTip} />
              <UploadImage
                field={field}
                label={<span className="text-foreground">{t.onboarding.uploadLogo}</span>}
              />
            </div>
          )}
        />

        <Controller
          name="store.banner_url"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col items-center text-center">
              <UploadLabel label={t.onboarding.storeBanner} tooltip={t.onboarding.storeBannerTip} />
              <UploadImage
                field={field}
                label={<span className="text-foreground">{t.onboarding.uploadBanner}</span>}
              />
            </div>
          )}
        />

        <Controller
          name="store.contact_email"
          control={control}
          render={({ field, fieldState }) => (
            <PillField
              id="store_contact_email"
              type="email"
              label={t.onboarding.contactEmail}
              value={field.value}
              onChange={field.onChange}
              placeholder={t.onboarding.contactEmailPlaceholder}
              required
              tooltip={t.onboarding.contactEmailTip}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="store.contact_phone"
          control={control}
          render={({ field, fieldState }) => (
            <PillField
              id="store_contact_phone"
              type="tel"
              label={t.onboarding.contactPhone}
              value={field.value}
              onChange={field.onChange}
              placeholder={t.onboarding.contactPhonePlaceholder}
              required
              tooltip={t.onboarding.contactPhoneTip}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="store.business_address"
          control={control}
          render={({ field, fieldState }) => (
            <PillTextArea
              id="business_address"
              label={t.onboarding.businessAddress}
              value={field.value}
              onChange={field.onChange}
              placeholder={t.onboarding.businessAddressPlaceholder}
              required
              tooltip={t.onboarding.businessAddressTip}
              error={fieldState.error?.message}
              className="md:col-span-2"
            />
          )}
        />
      </div>

      <div className="flex items-start space-x-3 mt-8 p-4 bg-chart-2/5 rounded-2xl border border-chart-2/15">
        <div className="shrink-0 text-chart-2">
          <ShieldCheck className="h-5 w-5" />
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
