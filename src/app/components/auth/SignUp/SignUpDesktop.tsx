"use client";
import { cn } from "@/lib/utils";
import { SignUpForm } from "./SignUpForm";
import { UseFormReturn } from "react-hook-form";
import { SignUpFormValues } from "../../../../lib/utils/formSchema";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link"; // Import the Link component

interface SignUpDesktopProps {
  form: UseFormReturn<SignUpFormValues>;
  onSubmit: (values: SignUpFormValues) => Promise<void>;
  isLoading: boolean;
  className?: string;
}

export function SignUpDesktop({
  form,
  onSubmit,
  isLoading,
  className,
}: SignUpDesktopProps) {
  return (
    <div className={cn("flex min-h-screen", className)}>
      {/* Left Side - Image */}
      <div className="hidden md:block w-1/2 bg-black relative">
        <Image
          src="/bgImage.png"
          alt="Sign up background"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Right Side - Content */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-black">
        <div className="w-full max-w-md space-y-6">
          {/* Title and Description - Outside Card */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white text-left">Create Account</h1>
            <p className="text-muted-foreground mt-2 text-left">
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
    </div>
  );
}