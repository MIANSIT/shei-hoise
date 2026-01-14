"use client";

import { Controller, Control } from "react-hook-form";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import { FormItemWrapper } from "./FormItemWrapper";
import { RichTextController } from "./RichTextController";
import { Form } from "antd";

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

        <div className="p-4 bg-blue-50 border border-blue-100 rounded-md mt-6">
          <p className="text-sm text-blue-700">
            <span className="font-medium">Important:</span> Ensure that your
            Terms & Conditions and Privacy Policy are thorough, accurate, and
            fully compliant with applicable local laws and regulations.
          </p>
        </div>
      </div>
    </>
  );
}
