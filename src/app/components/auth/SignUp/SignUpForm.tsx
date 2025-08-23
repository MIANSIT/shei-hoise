"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signUpSchema, SignUpFormValues } from "@/lib/utils/formSchema";
import { UserForm } from "../../common/UserForm";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/"; // fallback if no redirect

  const defaultValues: SignUpFormValues = { name: "", email: "", password: "" };

  const handleSubmit = async (values: SignUpFormValues) => {
    console.log("Signup values:", values);

    // simulate API call
    await new Promise((res) => setTimeout(res, 1000));

    // Redirect after successful signup
    router.push(redirectTo);
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
