"use client";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { SignUpForm } from "./SignUpForm";
import { UseFormReturn } from "react-hook-form";
import { SignUpFormValues } from "../../../../lib/utils/formSchema";

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
    <div className={cn("flex min-h-screen items-center justify-center bg-black p-8", className)}>
      <Card className="w-full max-w-lg mx-auto rounded-xl shadow-lg">
        <CardContent className="p-10">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-white">Sign Up</h1>
            <p className="text-base text-muted-foreground mt-1">Create your premium account</p>
          </div>

          <SignUpForm form={form} onSubmit={onSubmit} isLoading={isLoading} />

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline hover:text-primary/80">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}