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
          label={<span className="text-foreground">Currency</span>}
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
            <span className="text-foreground flex items-center gap-2">
              Tax Rate (%)
              <Tooltip title="This tax is applied to every order.">
                <InfoCircleOutlined className="text-muted-foreground" />
              </Tooltip>
            </span>
          }
          error={errors?.store_settings?.tax_rate}
        >
          <Controller
            name="store_settings.tax_rate"
            control={control}
            render={({ field }) => (
              <InputNumber
                {...field}
                min={0}
                style={{ width: "150px" }} // increased width
              />
            )}
          />
        </FormItemWrapper>

        {/* Processing Time */}
        <FormItemWrapper
          label={
            <span className="text-foreground">Processing Time (days)</span>
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
          label={<span className="text-foreground">Return Policy Days</span>}
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
      {/* Shipping Fees */}
      <div className="space-y-4">
        <h4 className="text-xl font-semibold">Shipping Fees</h4>

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
                              option === nameField.value
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

                {/* Estimated Days */}
                <div>
                  <Space.Compact className="w-full">
                    <Controller
                      name={`store_settings.shipping_fees.${index}.estimated_days`}
                      control={control}
                      render={({ field }) => (
                        <InputNumber
                          {...field}
                          min={1}
                          className="w-full"
                          placeholder="Delivery days"
                          onChange={(value) => field.onChange(value ?? 0)}
                        />
                      )}
                    />
                    <span className="px-3 text-muted-foreground text-sm">
                      days
                    </span>
                  </Space.Compact>
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
          onClick={() =>
            append({
              name: "",
              price: 1,
              estimated_days: 1,
            })
          }
        >
          Add Shipping Method
        </Button>
      </div>
      <div className="flex items-start space-x-3 mt-4 p-4 bg-muted rounded-lg border border-border">
        <div className="shrink-0 text-emerald-600">
          <SafetyOutlined className="text-xl" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">Protected Store Information</h4>
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
