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

const { Option } = Select;

const shippingOptions = ["Inside Dhaka", "Outside Dhaka"] as const;

interface Props {
  control: Control<CreateUserType>;
  errors?: FieldErrors<CreateUserType>;
}

export default function StoreSettings({ control, errors }: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "store_settings.shipping_fees",
  });

  const selectedOptions = fields.map((f) => f.name);

  return (
    <div className="">
      {/* Header */}
      <h3 className="text-2xl font-semibold mb-2">Store Settings</h3>
      <p className="text-sm text-muted-foreground">
        Configure your store preferences, pricing, and delivery options.
      </p>

      {/* Basic Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Currency */}
        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              Currency
              <Tooltip title="Select the default currency for all transactions in your store">
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
                placeholder="Select currency"
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
              Tax Rate (Tk)
              <Tooltip title="Enter the tax amount to be applied to every order (e.g., 50 for 50 Tk tax)">
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

        <FormItemWrapper
          label={
            <span className="text-foreground flex items-center gap-1">
              Minimum Order Value (Tk)
              <Tooltip title="Enter the minimum order value for customers to place an order (e.g., 50 for 50 Tk minimum)">
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
              Processing Time (days)
              <Tooltip title="Number of business days needed to prepare and package orders before shipping">
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
              Return Policy Days
              <Tooltip title="Number of days customers have to return products after delivery (0 = no returns accepted)">
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
          <h4 className="text-xl font-semibold">Shipping Fees</h4>
          <Tooltip title="Configure shipping methods, delivery fees, and estimated delivery times for different locations">
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
              {/* Header Row */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Shipping Method {index + 1}
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

              {/* Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Method */}
                <Controller
                  name={`store_settings.shipping_fees.${index}.name`}
                  control={control}
                  render={({ field: nameField }) =>
                    isDropdown ? (
                      <Select
                        {...nameField}
                        placeholder="Select delivery area"
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
                        placeholder="Shipping method name"
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
                          placeholder="Fee"
                        />
                      )}
                    />
                    <span className="px-3 text-muted-foreground text-sm">
                      BDT
                    </span>
                  </Space.Compact>
                </div>

                {/* Estimated Days Range */}
                <div>
                  <Controller
                    name={`store_settings.shipping_fees.${index}.estimated_days`}
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="e.g., 2-3"
                        suffix={
                          <span className="text-muted-foreground text-sm">
                            days
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
          Add Shipping Method
        </Button>
        <Divider className="border-border mt-8" />

        {/* Social Media Links */}
        <div className="space-y-4">
          <div className="flex items-center gap-1">
            <h4 className="text-xl font-semibold">Social Media Links</h4>
            <Tooltip title="Add links to your store's social media profiles to connect with customers">
              <InfoCircleOutlined className="text-muted-foreground text-sm cursor-help" />
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground">
            Optional links to your store&apos;s social media profiles.
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
                      Facebook Page
                      <Tooltip title="Enter the full URL of your Facebook business page">
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
                      Instagram Profile
                      <Tooltip title="Enter the full URL of your Instagram business profile">
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
                      Youtube
                      <Tooltip title="Enter the full URL of your Youtube channel">
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
                      Twitter / X
                      <Tooltip title="Enter the full URL of your Twitter/X profile">
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
            Protected Store Information
          </h4>
          <p className="text-sm text-muted-foreground">
            Your store information, including pricing, shipping, and policies,
            is securely encrypted and stored. Only authorized personnel can
            access this data, ensuring your business remains safe and private.
          </p>
        </div>
      </div>
    </div>
  );
}
