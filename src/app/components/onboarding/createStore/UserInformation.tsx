"use client";

import { Input, Select, Tooltip } from "antd";
import { Controller, Control, useWatch } from "react-hook-form";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import { FormItemWrapper } from "./FormItemWrapper";
import { InfoCircleOutlined } from "@ant-design/icons";
import { USER_TYPES, USER_TYPE_LABELS } from "@/lib/types/enums";
import { UseFormReturn } from "react-hook-form";

interface Props {
  control: Control<CreateUserType>;
  formState: UseFormReturn<CreateUserType>;
}

export default function UserInformation({ control, formState }: Props) {
  const { errors } = formState.formState;
  const password = useWatch({ control, name: "password" });

  const checks = [
    { label: "8+ characters", valid: (password?.length || 0) >= 8 },
    { label: "Uppercase letter", valid: /[A-Z]/.test(password || "") },
    { label: "Lowercase letter", valid: /[a-z]/.test(password || "") },
    { label: "Number", valid: /[0-9]/.test(password || "") },
    {
      label: "Special character",
      valid: /[!@#$%^&*(),.?":{}|<>]/.test(password || ""),
    },
  ];

  return (
    <>
      <h3 className="text-xl font-semibold mb-4">User Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          <FormItemWrapper label="User Type" required error={errors.user_type}>
            <Controller
              name="user_type"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={Object.values(USER_TYPES).map((type) => ({
                    value: type,
                    label: USER_TYPE_LABELS[type],
                  }))}
                />
              )}
            />
          </FormItemWrapper>

          <FormItemWrapper label="Email" required error={errors.email}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => <Input {...field} type="email" />}
            />
          </FormItemWrapper>

          <FormItemWrapper label="Password" required error={errors.password}>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  suffix={
                    <Tooltip
                      title={
                        <ul className="text-sm m-0 p-0 list-none">
                          {checks.map((check, idx) => (
                            <li
                              key={idx}
                              className={
                                check.valid ? "text-green-600" : "text-red-600"
                              }
                            >
                              {check.label}
                            </li>
                          ))}
                        </ul>
                      }
                      placement="topRight"
                    >
                      <InfoCircleOutlined className="text-red-600! cursor-pointer" />
                    </Tooltip>
                  }
                />
              )}
            />
          </FormItemWrapper>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <FormItemWrapper
            label="First Name"
            required
            error={errors.first_name}
          >
            <Controller
              name="first_name"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </FormItemWrapper>

          <FormItemWrapper label="Last Name" required error={errors.last_name}>
            <Controller
              name="last_name"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </FormItemWrapper>

          <FormItemWrapper label="Phone" error={errors.phone} required>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => <Input {...field} type="tel" />}
            />
          </FormItemWrapper>

          <FormItemWrapper label="Country" error={errors.profile?.country}>
            <Controller
              name="profile.country"
              control={control}
              render={({ field }) => <Input {...field} readOnly />}
            />
          </FormItemWrapper>
        </div>
      </div>
    </>
  );
}
