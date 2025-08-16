"use client";
import { UseFormReturn } from "react-hook-form";
import { SignUpFormValues } from "../../../../lib/utils/formSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheiAlert, SheiAlertDescription } from "../../ui/shei-alert/alert";
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
          <SheiAlert variant="destructive" className="mt-1">
            <SheiAlertDescription>
              {form.formState.errors.firstName.message}
            </SheiAlertDescription>
          </SheiAlert>
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
          <SheiAlert variant="destructive" className="mt-1">
            <SheiAlertDescription>
              {form.formState.errors.lastName.message}
            </SheiAlertDescription>
          </SheiAlert>
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
          <SheiAlert variant="destructive" className="mt-1">
            <SheiAlertDescription>
              {form.formState.errors.email.message}
            </SheiAlertDescription>
          </SheiAlert>
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
          <SheiAlert variant="destructive" className="mt-1">
            <SheiAlertDescription>
              {form.formState.errors.phone.message}
            </SheiAlertDescription>
          </SheiAlert>
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
          <SheiAlert variant="destructive" className="mt-1">
            <SheiAlertDescription>
              {form.formState.errors.password.message}
            </SheiAlertDescription>
          </SheiAlert>
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
          <SheiAlert variant="destructive" className="mt-1">
            <SheiAlertDescription>
              {form.formState.errors.confirmPassword.message}
            </SheiAlertDescription>
          </SheiAlert>
        )}
      </div>

      <Button type="submit" className="w-full mt-2" disabled={isLoading}>
        {isLoading ? "Processing..." : "Register"}
      </Button>
    </form>
  );
}