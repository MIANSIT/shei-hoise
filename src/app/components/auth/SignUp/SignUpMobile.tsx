"use client";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { SignUpForm } from "./SignUpForm";
import { UseFormReturn } from "react-hook-form";
import { SignUpFormValues } from "../../../../lib/utils/formSchema";

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
    <div className={cn("min-h-screen bg-black p-4 flex items-center", className)}>
      <Card className="w-full mx-auto rounded-xl shadow-lg">
        <CardContent className="p-6">
          <div className="mb-4 text-center">
            <h1 className="text-2xl font-bold text-white">Sign Up</h1>
            <p className="text-sm text-muted-foreground mt-1">Create your premium account</p>
          </div>

          <SignUpForm form={form} onSubmit={onSubmit} isLoading={isLoading} />

          <div className="mt-4 text-center text-sm text-muted-foreground">
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