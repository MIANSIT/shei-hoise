"use client";

import { Path } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { PasswordToggle } from "../common/PasswordToggle";
import { SheiLoader } from "../ui/SheiLoader/loader";
import Link from "next/link";
import { ZodObject, ZodTypeAny } from "zod";
import { useZodForm } from "../../../lib/utils/useZodForm";
import { DefaultValues } from "react-hook-form";

interface UserFormProps<T extends Record<string, unknown>> {
  schema: ZodObject<Record<string, ZodTypeAny>>;
  defaultValues: DefaultValues<T>;
  onSubmit: (values: T) => Promise<void>;
  hiddenFields?: Partial<Record<keyof T, boolean>>;
  footer?: {
    text?: string;          // e.g. "Don't have an account?"
    linkText?: string;      // e.g. "Sign up"
    linkUrl?: string;       // e.g. "/sign-up"
  };
  submitText: string;
}

export function UserForm<T extends Record<string, unknown>>({
  schema,
  defaultValues,
  onSubmit,
  hiddenFields = {},
  footer,
  submitText,
}: UserFormProps<T>) {
  const form = useZodForm<T>(schema, defaultValues);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: T) => {
    setIsLoading(true);
    try {
      await onSubmit(values);
      form.reset();
    } finally {
      setIsLoading(false);
    }
  };

  const renderError = (fieldName: keyof T) =>
    form.formState.errors[fieldName as Path<T>] ? (
      <p className="text-sm text-destructive mt-1">
        {form.formState.errors[fieldName as Path<T>]?.message as string}
      </p>
    ) : null;

  const renderField = (key: keyof T) => {
    if (hiddenFields[key]) return null;

    const isPassword = key === "password" || key === "confirmPassword";
    const label = String(key)
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());

    return (
      <div key={String(key)} className="grid gap-2 relative">
        <Label htmlFor={String(key)} className="text-foreground">{label}</Label>
        <div className={isPassword ? "relative" : ""}>
          <Input
            {...form.register(key as Path<T>)}
            placeholder={label}
            type={isPassword ? (showPassword ? "text" : "password") : "text"}
            disabled={isLoading}
            className={isPassword ? "pr-14" : ""}
          />
          {isPassword && (
            <div className="absolute inset-y-0 right-2 flex items-center">
              <PasswordToggle
                show={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
              />
            </div>
          )}
        </div>
        {renderError(key)}
      </div>
    );
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {Object.keys(defaultValues).map((key) => renderField(key as keyof T))}

      <Button
        type="submit"
        className="w-full mt-2 relative overflow-hidden"
        disabled={isLoading}
      >
        {isLoading ? (
          <SheiLoader
            size="sm"
            loaderColor="current"
          />
        ) : (
          submitText
        )}
      </Button>

      {footer?.text && footer?.linkText && footer?.linkUrl && (
        <p className="text-sm text-muted-foreground text-center mt-2">
          {footer.text}{" "}
          <Link href={footer.linkUrl} className="text-foreground hover:underline">
            {footer.linkText}
          </Link>
        </p>
      )}
    </form>
  );
}