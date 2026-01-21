"use client";

import { Controller, Control } from "react-hook-form";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import { FormItemWrapper } from "./FormItemWrapper";
import { RichTextController } from "./RichTextController";
import { Form } from "antd";
import { SafetyOutlined } from "@ant-design/icons";

interface Props {
  control: Control<CreateUserType>;
}

export default function TermsPrivacy({ control }: Props) {
  return (
    <>
      <div className="space-y-8">
        {/* Option 1: Use vertical layout form */}
        <Form layout="vertical">
          <FormItemWrapper
            label="Terms & Conditions"
            labelCol={{ span: 24 }}
            wrapperCol={{ span: 24 }}
          >
            <Controller
              name="store_settings.terms_and_conditions"
              control={control}
              render={({ field }) => (
                <RichTextController
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </FormItemWrapper>

          <FormItemWrapper
            label="Privacy Policy"
            labelCol={{ span: 24 }}
            wrapperCol={{ span: 24 }}
          >
            <Controller
              name="store_settings.privacy_policy"
              control={control}
              render={({ field }) => (
                <RichTextController
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </FormItemWrapper>
        </Form>

        <div className="flex items-start space-x-3 mt-4 p-4 bg-muted rounded-lg border border-border">
          <div className="shrink-0 text-emerald-600">
            <SafetyOutlined className="text-xl" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">
              Store Security & Compliance
            </h4>
            <p className="text-sm text-muted-foreground">
              Ensure your store&apos;s security guidelines and data protection
              policies are complete, accurate, and compliant with all applicable
              laws, keeping your business and customers safe.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
