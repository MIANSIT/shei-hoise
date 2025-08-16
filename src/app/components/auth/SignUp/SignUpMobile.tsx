"use client";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { SignUpForm } from "./SignUpForm";
import { UseFormReturn } from "react-hook-form";
import { SignUpFormValues } from "../../../../lib/utils/formSchema";

import Link from "next/link";

interface SignUpMobileProps {
  form: UseFormReturn<SignUpFormValues>;
  onSubmit: (values: SignUpFormValues) => Promise<void>;
  isLoading: boolean;
  className?: string;
}

export function SignUpMobile({
  form,
  onSubmit,
  isLoading,
  className,
}: SignUpMobileProps) {
  return (
    <div
      className={cn("min-h-screen bg-black p-6 flex items-center", className)}
    >
      <div className="w-full space-y-6">
        {/* Title and Description - Outside Card */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-muted-foreground mt-2">
            Enter your details to create your account
          </p>
        </div>

        {/* Form Card */}
        <Card className="p-6">
          <SignUpForm form={form} onSubmit={onSubmit} isLoading={isLoading} />
        </Card>

        {/* Social Login */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
        </div>

        {/* Sign In Link */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary font-bold hover:text-primary/80"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
