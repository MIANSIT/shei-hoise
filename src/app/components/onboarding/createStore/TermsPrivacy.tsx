"use client";

import { Controller, Control } from "react-hook-form";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import { FormItemWrapper } from "./FormItemWrapper";
import { RichTextController } from "./RichTextController";
import { Form, Tooltip } from "antd";
import { SafetyOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "@/lib/hook/useTranslation";

interface Props {
  control: Control<CreateUserType>;
}

export default function TermsPrivacy({ control }: Props) {
  const t = useTranslation();

  return (
    <>
      <div className="space-y-8">
        <Form layout="vertical">
          <FormItemWrapper
            label={
              <span className="text-foreground flex items-center gap-1">
                {t.onboarding.termsLabel}
                <Tooltip title={t.onboarding.termsTip}>
                  <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                </Tooltip>
              </span>
            }
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
            label={
              <span className="text-foreground flex items-center gap-1">
                {t.onboarding.privacyLabel}
                <Tooltip title={t.onboarding.privacyTip}>
                  <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                </Tooltip>
              </span>
            }
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
              {t.onboarding.complianceTitle}
            </h4>
            <p className="text-sm text-muted-foreground">
              {t.onboarding.complianceDesc}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
