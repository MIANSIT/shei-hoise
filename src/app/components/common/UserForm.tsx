/* eslint-disable @typescript-eslint/no-explicit-any */
// components/common/UserForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { 
  LoginFormSchema, 
  LoginFormType,
  signUpSchema,
  SignUpFormValues 
} from "../../../lib/utils/formSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordToggle } from "../common/PasswordToggle";
import { PasswordStrength } from "../common/PasswordStrength";
import { SheiLoader } from "../ui/SheiLoader/loader";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { supabase } from "../../../lib/supabase";

// ✅ Simplified interface
interface UserFormProps {
  submitText?: string;
  theme?: "light" | "dark";
  defaultValues?: any;
  onSubmit?: (values: any) => void;
  mode?: "login" | "signup";
  isAdmin?: boolean; // Add this prop
}

export function UserForm({
  submitText,
  theme = "light",
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
      console.log("Initializing form with default values:", defaultValues);
      form.reset(defaultValues);
    }
  }, [defaultValues, form]);

  // Pre-fill email if available in URL params
  useEffect(() => {
    if (emailFromParams) {
      console.log("Setting email from URL params:", emailFromParams);
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
        error(loginError.message || "Login failed. Please try again.");
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
  } = form;

  const [showPassword, setShowPassword] = useState(false);
  
  // ✅ Watch password for strength indicator (only for signup)
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
      <div className="grid gap-2">
        <Label htmlFor="email" className="font-bold">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          {...form.register(mode === "signup" ? "email" : "username")}
          disabled={isSubmitting}
          className={
            theme === "dark"
              ? "border-gray-600 placeholder-gray-400"
              : "border-gray-300 placeholder-gray-500"
          }
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
      <div className="grid gap-2 relative">
        <Label htmlFor="password" className="font-bold">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            {...form.register("password")}
            disabled={isSubmitting}
            className={
              theme === "dark"
                ? "border-gray-600 placeholder-gray-400 pr-14"
                : "border-gray-300 placeholder-gray-500 pr-14"
            }
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <PasswordToggle
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
            />
          </div>
        </div>
        {/* ✅ Fixed TypeScript error by safely accessing error message */}
        {errors.password && (
          <p className="text-sm text-red-500">{getErrorMessage(errors.password)}</p>
        )}
        
        {/* ✅ Password Strength Indicator (only for signup) */}
        {mode === "signup" && (
          <PasswordStrength password={watchedPassword} />
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