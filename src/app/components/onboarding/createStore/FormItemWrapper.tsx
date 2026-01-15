import { Form, FormItemProps } from "antd";
import { FieldError } from "react-hook-form";
import React from "react";

interface FormItemWrapperProps extends FormItemProps {
  error?: FieldError | string;
  children: React.ReactNode;
  label?: React.ReactNode; // Can be string or JSX (<span className="text-foreground">)
  className?: string;      // For additional custom styling
}

export function FormItemWrapper({
  error,
  children,
  label,
  className = "",
  ...props
}: FormItemWrapperProps) {
  // Determine error message
  const errorMessage = typeof error === "string" ? error : error?.message;

  return (
    <Form.Item
      preserve={false}
      label={label}
      colon={false}
      labelCol={{ span: 24 }}
      wrapperCol={{ span: 24 }}
      validateStatus={error ? "error" : undefined}
      help={errorMessage ? <span className="text-destructive text-xs">{errorMessage}</span> : undefined}
      className={`mb-2 ${className}`} // <-- automatic compact margin
      {...props}
    >
      {children}
    </Form.Item>
  );
}
