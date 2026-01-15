"use client";

import { InputNumber, Input, Button, Space, Select } from "antd";
import {
  Controller,
  Control,
  useFieldArray,
  FieldErrors,
} from "react-hook-form";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import { PlusOutlined, MinusOutlined } from "@ant-design/icons";
import { FormItemWrapper } from "./FormItemWrapper";

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
    <>
      <h3 className="text-xl font-semibold mb-4">Store Settings</h3>

      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex-1 min-w-37.5">
          <FormItemWrapper label="Currency">
            <Input value="BDT" readOnly />
          </FormItemWrapper>
        </div>

        <div className="flex-1 min-w-37.5">
          <FormItemWrapper
            label="Tax Rate (%)"
            error={errors?.store_settings?.tax_rate}
          >
            <Controller
              name="store_settings.tax_rate"
              control={control}
              render={({ field }) => (
                <InputNumber {...field} min={0} className="w-full" />
              )}
            />
          </FormItemWrapper>
        </div>

        <div className="flex-1 min-w-37.5">
          <FormItemWrapper
            label="Min Order Amount"
            error={errors?.store_settings?.min_order_amount}
          >
            <Controller
              name="store_settings.min_order_amount"
              control={control}
              render={({ field }) => (
                <InputNumber {...field} min={0} className="w-full" />
              )}
            />
          </FormItemWrapper>
        </div>

        <div className="flex-1 min-w-37.5">
          <FormItemWrapper
            label="Processing Time (days)"
            error={errors?.store_settings?.processing_time_days}
          >
            <Controller
              name="store_settings.processing_time_days"
              control={control}
              render={({ field }) => (
                <InputNumber {...field} min={1} className="w-full" />
              )}
            />
          </FormItemWrapper>
        </div>

        <div className="flex-1 min-w-37.5">
          <FormItemWrapper
            label="Return Policy Days"
            error={errors?.store_settings?.return_policy_days}
          >
            <Controller
              name="store_settings.return_policy_days"
              control={control}
              render={({ field }) => (
                <InputNumber {...field} min={0} className="w-full" />
              )}
            />
          </FormItemWrapper>
        </div>
      </div>

      <h4 className="text-lg font-semibold mt-6 mb-4">Shipping Fees</h4>

      <div className="space-y-4">
        {fields.map((field, index) => {
          const isDropdown = index < 2;

          return (
            <div key={field.id} className="flex items-start gap-3">
              <div className="w-48 pt-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shipping Fee {field.name || index + 1}
                  {errors?.store_settings?.shipping_fees?.[index]?.name && (
                    <span className="text-red-500 text-xs ml-1">
                      {
                        errors.store_settings.shipping_fees[index]?.name
                          ?.message
                      }
                    </span>
                  )}
                </label>
              </div>

              <div className="flex-1">
                <Space>
                  <Controller
                    name={`store_settings.shipping_fees.${index}.name`}
                    control={control}
                    render={({ field: nameField }) =>
                      isDropdown ? (
                        <Select
                          {...nameField}
                          style={{ width: 200 }}
                          placeholder="Select shipping option"
                          value={nameField.value as string | undefined}
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
                          {...nameField}
                          style={{ width: 200 }}
                          placeholder="Shipping name"
                        />
                      )
                    }
                  />

                  <Controller
                    name={`store_settings.shipping_fees.${index}.price`}
                    control={control}
                    render={({ field: priceField }) => (
                      <InputNumber
                        {...priceField}
                        min={0}
                        style={{ width: 150 }}
                        placeholder="Price"
                        addonAfter="BDT"
                      />
                    )}
                  />

                  {fields.length > 1 && (
                    <Button
                      type="text"
                      danger
                      icon={<MinusOutlined />}
                      onClick={() => remove(index)}
                      className="shrink-0"
                    />
                  )}
                </Space>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => append({ name: "", price: 0 })}
        >
          Add Shipping Fee
        </Button>
      </div>
    </>
  );
}
