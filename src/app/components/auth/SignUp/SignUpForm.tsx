"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signUpSchema, SignUpFormValues } from "@/lib/utils/formSchema";
import { UserForm } from "../../common/UserForm";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification"; // Adjust the import path as needed

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/"; // fallback if no redirect
  const { success, error } = useSheiNotification();

  const defaultValues: SignUpFormValues = { name: "", email: "", password: "" };

  const handleSubmit = async (values: SignUpFormValues) => {
    console.log("Signup values:", values);

    try {
      // simulate API call
      await new Promise((res) => setTimeout(res, 1000));
      
      // Simulate successful signup
      success("Account created successfully! Redirecting...", { duration: 1000 });
      
      // Add a small delay before redirecting to show the notification
      setTimeout(() => {
        router.push(redirectTo);
      }, 500);
      
    } catch {
      // Handle signup error
      error("Signup failed. Please try again.");
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-left text-white">
          Create Account
        </h1>
        <p className="mt-2 text-gray-400 text-left">
          Enter your details to create your account
        </p>
      </div>
      <UserForm
        schema={signUpSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitText="Create Account"
        footer={{
          text: "Already have an account?",
          linkText: "Sign in",
          linkUrl: `/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`,
        }}
      />
    </div>
  );
}