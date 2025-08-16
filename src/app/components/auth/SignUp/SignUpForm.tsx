"use client";
import { UseFormReturn } from "react-hook-form";
import { SignUpFormValues } from "../../../../lib/utils/formSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface RegistrationFormProps {
  form: UseFormReturn<SignUpFormValues>;
  onSubmit: (values: SignUpFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function SignUpForm({ form, onSubmit, isLoading }: RegistrationFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* First Name */}
      <div className="grid gap-2">
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          type="text"
          {...form.register("firstName")}
        />
        {form.formState.errors.firstName && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.firstName.message}
          </p>
        )}
      </div>

      {/* Last Name */}
      <div className="grid gap-2">
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          type="text"
          {...form.register("lastName")}
        />
        {form.formState.errors.lastName && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.lastName.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
        />
        {form.formState.errors.email && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      {/* Phone */}
      <div className="grid gap-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          {...form.register("phone")}
        />
        {form.formState.errors.phone && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.phone.message}
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
            {...form.register("password")}
          />
          <span
            className="absolute inset-y-0 right-2 flex items-center cursor-pointer text-gray-400"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </span>
        </div>
        {form.formState.errors.password && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="grid gap-2 relative">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            className="pr-10"
            {...form.register("confirmPassword")}
          />
          <span
            className="absolute inset-y-0 right-2 flex items-center cursor-pointer text-gray-400"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </span>
        </div>
        {form.formState.errors.confirmPassword && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full mt-2" disabled={isLoading}>
        {isLoading ? "Processing..." : "Register"}
      </Button>
    </form>
  );
}