"use client";

import {
  InputNumber,
  Input,
  Button,
  Space,
  Select,
  Divider,
  Tooltip,
} from "antd";
import {
  Controller,
  Control,
  useFieldArray,
  FieldErrors,
} from "react-hook-form";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import {
  PlusOutlined,
  MinusOutlined,
  InfoCircleOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { FormItemWrapper } from "./FormItemWrapper";
import { Currency } from "@/lib/types/enums";
import { useTranslation } from "@/lib/hook/useTranslation";

const { Option } = Select;

const shippingOptions = ["Inside Dhaka", "Outside Dhaka"] as const;

interface Props {
  control: Control<CreateUserType>;
  errors?: FieldErrors<CreateUserType>;
}

export default function StoreSettings({ control, errors }: Props) {
  const t = useTranslation();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "store_settings.shipping_fees",
  });

  const selectedOptions = fields.map((f) => f.name);

  return (
    <div className="">
      <h3 className="text-2xl font-semibold mb-2">{t.onboarding.settingsTitle}</h3>
      <p className="text-sm text-muted-foreground">
        {t.onboarding.settingsSubtitle}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Currency */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              {t.onboarding.currency}
              <Tooltip title={t.onboarding.currencyTip}>
                <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
              </Tooltip>
            </span>
          }
        >
          <Controller
            name="store_settings.currency"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                placeholder={t.onboarding.currencyPlaceholder}
                style={{ width: "150px" }}
              >
                {Object.values(Currency).map((c) => (
                  <Option key={c} value={c}>
                    {c}
                  </Option>
                ))}
              </Select>
            )}
          />
        </FormItemWrapper>

        {/* Tax Rate */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              {t.onboarding.taxRate}
              <Tooltip title={t.onboarding.taxRateTip}>
                <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
              </Tooltip>
            </span>
          }
          error={errors?.store_settings?.tax_rate}
        >
          <Controller
            name="store_settings.tax_rate"
            control={control}
            render={({ field }) => (
              <InputNumber {...field} min={0} style={{ width: "150px" }} />
            )}
          />
        </FormItemWrapper>

        {/* Min Order */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              {t.onboarding.minOrder}
              <Tooltip title={t.onboarding.minOrderTip}>
                <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
              </Tooltip>
            </span>
          }
          error={errors?.store_settings?.min_order_amount}
        >
          <Controller
            name="store_settings.min_order_amount"
            control={control}
            render={({ field }) => (
              <InputNumber {...field} min={0} style={{ width: "150px" }} />
            )}
          />
        </FormItemWrapper>

        {/* Processing Time */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              {t.onboarding.processingTime}
              <Tooltip title={t.onboarding.processingTimeTip}>
                <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
              </Tooltip>
            </span>
          }
          error={errors?.store_settings?.processing_time_days}
        >
          <Controller
            name="store_settings.processing_time_days"
            control={control}
            render={({ field }) => (
              <InputNumber {...field} min={1} style={{ width: "150px" }} />
            )}
          />
        </FormItemWrapper>

        {/* Return Policy */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              {t.onboarding.returnDays}
              <Tooltip title={t.onboarding.returnDaysTip}>
                <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
              </Tooltip>
            </span>
          }
          error={errors?.store_settings?.return_policy_days}
        >
          <Controller
            name="store_settings.return_policy_days"
            control={control}
            render={({ field }) => (
              <InputNumber {...field} min={0} style={{ width: "150px" }} />
            )}
          />
        </FormItemWrapper>
      </div>

      <Divider className="border-border" />

      {/* Shipping Fees */}
      <div className="space-y-4">
        <div className="flex items-center gap-1">
          <h4 className="text-xl font-semibold">{t.onboarding.shippingFees}</h4>
          <Tooltip title={t.onboarding.shippingFeesTip}>
            <InfoCircleOutlined className="text-muted-foreground text-sm cursor-help" />
          </Tooltip>
        </div>

        {fields.map((field, index) => {
          const isDropdown = index < 2;

          return (
            <div
              key={field.id}
              className="rounded-lg border border-border bg-background p-4 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {t.onboarding.shippingMethod} {index + 1}
                </span>

                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<MinusOutlined />}
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Method */}
                <Controller
                  name={`store_settings.shipping_fees.${index}.name`}
                  control={control}
                  render={({ field: nameField }) =>
                    isDropdown ? (
                      <Select
                        {...nameField}
                        placeholder={t.onboarding.deliveryAreaPlaceholder}
                        className="w-full"
                      >
                        {shippingOptions
                          .filter(
                            (option) =>
                              !selectedOptions.includes(option) ||
                              option === nameField.value,
                          )
                          .map((option) => (
                            <Option key={option} value={option}>
                              {option}
                            </Option>
                          ))}
                      </Select>
                    ) : (
                      <Input
                        min={1}
                        {...nameField}
                        placeholder={t.onboarding.shippingNamePlaceholder}
                      />
                    )
                  }
                />

                {/* Fee */}
                <div>
                  <Space.Compact className="w-full">
                    <Controller
                      name={`store_settings.shipping_fees.${index}.price`}
                      control={control}
                      render={({ field }) => (
                        <InputNumber
                          {...field}
                          min={1}
                          className="w-full"
                          placeholder={t.onboarding.feePlaceholder}
                        />
                      )}
                    />
                    <span className="px-3 text-muted-foreground text-sm">
                      BDT
                    </span>
                  </Space.Compact>
                </div>

                {/* Estimated Days */}
                <div>
                  <Controller
                    name={`store_settings.shipping_fees.${index}.estimated_days`}
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder={t.onboarding.estimatedDaysPlaceholder}
                        suffix={
                          <span className="text-muted-foreground text-sm">
                            {t.onboarding.daysSuffix}
                          </span>
                        }
                        className="w-full"
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Button */}
        <Button
          type="dashed"
          block
          icon={<PlusOutlined />}
          className="bg-green-500! text-white! border-green-500!"
          onClick={() =>
            append({
              name: "",
              price: 1,
              estimated_days: "",
            })
          }
        >
          {t.onboarding.addShipping}
        </Button>

        <Divider className="border-border mt-8" />

        {/* Social Media Links */}
        <div className="space-y-4">
          <div className="flex items-center gap-1">
            <h4 className="text-xl font-semibold">{t.onboarding.socialMedia}</h4>
            <Tooltip title={t.onboarding.socialMediaTip}>
              <InfoCircleOutlined className="text-muted-foreground text-sm cursor-help" />
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground">
            {t.onboarding.socialMediaSubtitle}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Facebook */}
            <Controller
              name="store_settings.store_social_media.facebook_link"
              control={control}
              render={({ field, fieldState }) => (
                <FormItemWrapper
                  label={
                    <span className="text-foreground flex items-center gap-1">
                      {t.onboarding.facebook}
                      <Tooltip title={t.onboarding.facebookTip}>
                        <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                      </Tooltip>
                    </span>
                  }
                  error={fieldState.error?.message}
                >
                  <Input
                    {...field}
                    placeholder="https://facebook.com/yourstore"
                    value={field.value ?? ""}
                  />
                </FormItemWrapper>
              )}
            />

            {/* Instagram */}
            <Controller
              name="store_settings.store_social_media.instagram_link"
              control={control}
              render={({ field, fieldState }) => (
                <FormItemWrapper
                  label={
                    <span className="text-foreground flex items-center gap-1">
                      {t.onboarding.instagram}
                      <Tooltip title={t.onboarding.instagramTip}>
                        <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                      </Tooltip>
                    </span>
                  }
                  error={fieldState.error?.message}
                >
                  <Input
                    {...field}
                    placeholder="https://instagram.com/yourstore"
                    value={field.value ?? ""}
                  />
                </FormItemWrapper>
              )}
            />

            {/* Youtube */}
            <Controller
              name="store_settings.store_social_media.youtube_link"
              control={control}
              render={({ field, fieldState }) => (
                <FormItemWrapper
                  label={
                    <span className="text-foreground flex items-center gap-1">
                      {t.onboarding.youtube}
                      <Tooltip title={t.onboarding.youtubeTip}>
                        <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                      </Tooltip>
                    </span>
                  }
                  error={fieldState.error?.message}
                >
                  <Input
                    {...field}
                    placeholder="https://youtube.com/yourstore"
                    value={field.value ?? ""}
                  />
                </FormItemWrapper>
              )}
            />

            {/* Twitter / X */}
            <Controller
              name="store_settings.store_social_media.twitter_link"
              control={control}
              render={({ field, fieldState }) => (
                <FormItemWrapper
                  label={
                    <span className="text-foreground flex items-center gap-1">
                      {t.onboarding.twitter}
                      <Tooltip title={t.onboarding.twitterTip}>
                        <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                      </Tooltip>
                    </span>
                  }
                  error={fieldState.error?.message}
                >
                  <Input
                    {...field}
                    placeholder="https://twitter.com/yourstore"
                    value={field.value ?? ""}
                  />
                </FormItemWrapper>
              )}
            />
          </div>
        </div>
      </div>

      <div className="flex items-start space-x-3 mt-4 p-4 bg-muted rounded-lg border border-border">
        <div className="shrink-0 text-emerald-600">
          <SafetyOutlined className="text-xl" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">
            {t.onboarding.protectedTitle}
          </h4>
          <p className="text-sm text-muted-foreground">
            {t.onboarding.protectedDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
