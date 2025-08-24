"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { loginSchema, LoginFormValues } from "@/lib/utils/formSchema";
import { UserForm } from "../../common/UserForm";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification"; // Adjust the import path as needed

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/"; // default fallback
  const { success, error } = useSheiNotification();

  const defaultValues: LoginFormValues = { email: "", password: "" };

  const handleSubmit = async (values: LoginFormValues) => {
    console.log("Login form submitted with values:", values);

    try {
      // Simulate API call
      await new Promise((res) => setTimeout(res, 1000));
      
      // Simulate successful login
      success("Login successful! ", { duration: 1000 });

      // Add a small delay before redirecting to show the notification
      setTimeout(() => {
        router.push(redirectTo);
      }, 500);
      
    } catch {
      // Handle login error
      error("Login failed. Please check your credentials and try again.");
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-left text-white">Welcome back</h1>
        <p className="mt-2 text-gray-400 text-left">
          Enter your credentials to access your account
        </p>
      </div>

      <UserForm
        schema={loginSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        hiddenFields={{ name: true }}
        submitText="Sign In"
        footer={{
          text: "Don't have an account?",
          linkText: "Sign up",
          linkUrl: `/sign-up${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`,
        }}
      />
    </div>
  );
}