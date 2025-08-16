"use client";

import { useForm, UseFormReturn } from "react-hook-form";
import { SignUpFormValues, formSchema } from "../../../../lib/utils/formSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification";
import Link from "next/link";

interface SignUpFormProps {
  form?: UseFormReturn<SignUpFormValues>;
}

export function SignUpForm({ form }: SignUpFormProps) {
  const defaultForm = useForm<SignUpFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const internalForm = form || defaultForm;
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const sheiNotification = useSheiNotification();

  const handleSubmit = async (values: SignUpFormValues) => {
    setIsLoading(true);
    try {
      // 🟢 No API yet — just log values
      console.log("Signup values:", values);

      // Always succeed for now
      internalForm.reset();
      sheiNotification.success("Shei Hoise Account created successfully!", { duration: 3000 });
    } catch (error) {
      console.error("Shei Hoise Account creation failed:", error);
      sheiNotification.error("Shei Hoise Account creation failed. Please try again.", {
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title + Subtitle */}
      <div className="text-center">
        <h2 className="text-4xl font-semibold text-left">Create Account</h2>
        <p className="text-gray-500 text-sm text-left mt-2">
          Enter your details to create your account
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={internalForm.handleSubmit(handleSubmit)}
        className="space-y-4"
      >
        {/* Name */}
        <div className="grid gap-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            {...internalForm.register("name")}
          />
          {internalForm.formState.errors.name && (
            <p className="text-sm text-red-500 mt-1">
              {internalForm.formState.errors.name.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...internalForm.register("email")}
          />
          {internalForm.formState.errors.email && (
            <p className="text-sm text-red-500 mt-1">
              {internalForm.formState.errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="grid gap-2 relative">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              className="pr-10"
              autoComplete="new-password"
              {...internalForm.register("password")}
            />
            <span
              className="absolute inset-y-0 right-2 flex items-center cursor-pointer text-gray-400"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>
          {internalForm.formState.errors.password && (
            <p className="text-sm text-red-500 mt-1">
              {internalForm.formState.errors.password.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <Button type="submit" className="w-full mt-2" disabled={isLoading}>
          {isLoading ? "Processing..." : "Create account"}
        </Button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-white font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
