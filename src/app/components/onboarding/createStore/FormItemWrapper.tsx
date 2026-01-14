// components/FormItemWrapper.tsx
import { Form, FormItemProps } from "antd";
import { FieldError } from "react-hook-form";
import React from "react";

interface FormItemWrapperProps extends FormItemProps {
  error?: FieldError | string;
  children: React.ReactNode;
  className?: string;
}

export function FormItemWrapper({
  error,
  children,
  ...props
}: FormItemWrapperProps) {
  const errorMessage = typeof error === "string" ? error : error?.message;

  return (
    <Form.Item
      preserve={false}
      label={props.label} // keep the label
      colon={false} // optional: remove the colon
      labelCol={{ span: 24 }} // make label take full width
      wrapperCol={{ span: 24 }} // input takes full width
      validateStatus={error ? "error" : undefined}
      help={errorMessage}
      {...props}
    >
      {children}
    </Form.Item>
  );
}
