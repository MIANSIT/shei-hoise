/* eslint-disable @typescript-eslint/no-explicit-any */
// components/auth/SignUp/SignUpForm.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SignUpFormValues } from "@/lib/utils/formSchema";
import { UserForm } from "../../common/UserForm";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import { useEffect, useState } from "react";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const { success, error } = useSheiNotification();

  const { formData, clearFormData } = useCheckoutStore(); // Removed storeSlug
  const [isStoreLoaded, setIsStoreLoaded] = useState(false);

  // ✅ Wait for store to be hydrated from localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStoreLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [formData]);

  // ✅ Always get email from localStorage, even if empty
  const defaultValues: SignUpFormValues = {
    email: formData.email || "", // Will be empty string if no email in localStorage
    password: "",
  };

  const handleSubmit = async (values: SignUpFormValues | any) => {
    const signupValues = values as SignUpFormValues;

    try {
      // simulate API call
      await new Promise((res) => setTimeout(res, 1000));

      // Simulate successful signup
      success("Account created successfully! Redirecting...", {
        duration: 1000,
      });

      // Clear checkout data after successful signup
      clearFormData();

      // Add a small delay before redirecting to show the notification
      setTimeout(() => {
        router.push(redirectTo);
      }, 500);
    } catch {
      // Handle signup error
      error("Signup failed. Please try again.");
    }
  };

  // Show loading while store is being hydrated
  if (!isStoreLoaded) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your information...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-left text-foreground">
          Create Account
        </h1>
        <p className="mt-2 text-muted-foreground text-left">
          Enter your details to create your account
        </p>
      </div>

      <UserForm
        submitText="Create Account"
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        mode="signup"
      />
    </div>
  );
}
