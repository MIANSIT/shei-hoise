/* eslint-disable @typescript-eslint/no-explicit-any */
// components/common/UserForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

import {
  LoginFormSchema,
  LoginFormType,
  signUpSchema,
  SignUpFormValues
} from "../../../lib/utils/formSchema";
import { Button } from "@/components/ui/button";
import { PillField } from "../common/PillField";
import { PasswordField } from "../common/PasswordField";
import { PasswordStrength } from "../common/PasswordStrength";
import { SheiLoader } from "../ui/SheiLoader/loader";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { supabase } from "../../../lib/supabase";

// ✅ Simplified interface
interface UserFormProps {
  submitText?: string;
  defaultValues?: any;
  onSubmit?: (values: any) => void;
  mode?: "login" | "signup";
  isAdmin?: boolean; // Add this prop
}

export function UserForm({
  submitText,
  defaultValues,
  onSubmit,
  mode = "login",
  isAdmin = false // Default to false
}: UserFormProps) {
  const { success, error } = useSheiNotification();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ✅ Fix: Redirect to dashboard for admin login, otherwise use redirect param or root
  const redirectTo = searchParams.get("redirect") || (isAdmin ? "/dashboard" : "/");
  
  const emailFromParams = searchParams.get("email");

  const schema = mode === "signup" ? signUpSchema : LoginFormSchema;
  
  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || (mode === "signup" 
      ? { email: "", password: "" }
      : { username: "", password: "" }
    ),
    mode: "onChange",
  });

  // ✅ Always initialize form with provided default values
  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form]);

  // Pre-fill email if available in URL params
  useEffect(() => {
    if (emailFromParams) {
      if (mode === "signup") {
        form.setValue("email", emailFromParams);
      } else {
        form.setValue("username", emailFromParams);
      }
    }
  }, [emailFromParams, form, mode]);

  const finalSubmitText = submitText || (mode === "signup" ? "Create Account" : "Login");

  const handleSubmitForm = async (values: any) => {
    if (onSubmit) {
      return onSubmit(values);
    }

    if (mode === "signup") {
      try {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
        });

        if (signUpError) {
          error(signUpError.message || "Sign up failed. Please try again.");
          return;
        }

        success("Account created successfully! Please check your email to verify your account.");

        setTimeout(() => {
          router.push(redirectTo);
        }, 500);
      } catch (err) {
        error("Sign up failed. Please try again.");
      }
    } else {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: values.username,
        password: values.password,
      });

      if (loginError) {
        if (loginError.message.includes("Invalid login credentials")) {
          error("Wrong email or password");
        } else {
          error(loginError.message || "Login failed. Please try again.");
        }
        return;
      }

      success("Login successful!");

      setTimeout(() => {
        router.push(redirectTo);
      }, 500);
    }
  };

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = form;

  const emailFieldName = mode === "signup" ? "email" : "username";
  const watchedEmail = watch(emailFieldName);
  const watchedPassword = watch("password");

  // ✅ Fix TypeScript error by safely accessing error messages
  const getErrorMessage = (error: any) => {
    if (typeof error?.message === 'string') {
      return error.message;
    }
    return 'Invalid input';
  };

  return (
    <form
      onSubmit={handleSubmit(handleSubmitForm)}
      className="space-y-4"
      noValidate
    >
      {/* Email Field */}
      <div className="space-y-2">
        <PillField
          id="email"
          type="email"
          label="Email"
          value={watchedEmail || ""}
          onChange={(value) => setValue(emailFieldName, value, { shouldValidate: true })}
          placeholder="Enter your email"
          disabled={isSubmitting}
        />
        {/* ✅ Fixed TypeScript error by safely accessing error message */}
        {errors.email && (
          <p className="text-sm text-red-500">{getErrorMessage(errors.email)}</p>
        )}
        {errors.username && (
          <p className="text-sm text-red-500">{getErrorMessage(errors.username)}</p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <PasswordField
          id="password"
          label="Password"
          value={watchedPassword || ""}
          onChange={(value) => setValue("password", value, { shouldValidate: true })}
          placeholder="Enter your password"
          disabled={isSubmitting}
        />
        {/* ✅ Fixed TypeScript error by safely accessing error message */}
        {errors.password && (
          <p className="text-sm text-red-500">{getErrorMessage(errors.password)}</p>
        )}

        {/* ✅ Password Strength Indicator (only for signup) */}
        {mode === "signup" && (
          <PasswordStrength password={watchedPassword} />
        )}

        {/* Forgot Password link — only for admin login mode */}
        {isAdmin && mode !== "signup" && (
          <div className="flex justify-end">
            <Link
              href="/admin-login/forgot-password"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
            >
              Forgot Password?
            </Link>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full mt-2 relative overflow-hidden"
        disabled={!form.formState.isValid || isSubmitting}
        variant='greenish'
      >
        {isSubmitting ? (
          <SheiLoader size="sm" loaderColor="current" />
        ) : (
          <span className="text-white">{finalSubmitText}</span>
        )}
      </Button>
    </form>
  );
}