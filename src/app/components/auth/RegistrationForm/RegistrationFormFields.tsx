"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SheiAlert, SheiAlertDescription } from "../../ui/shei-alert/alert";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { RegistrationFormValues } from "../../../../lib/utils/formSchema";

interface Props {
  form: UseFormReturn<RegistrationFormValues>;
  onSubmit: (values: RegistrationFormValues) => void;
}

export default function RegistrationFormBase({ form, onSubmit }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {["firstName", "lastName", "email", "phone"].map((field) => (
        <div key={field} className="grid gap-2">
          <Label htmlFor={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</Label>
          <Input
            id={field}
            type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
            {...form.register(field as keyof RegistrationFormValues)}
          />
          {form.formState.errors[field as keyof RegistrationFormValues] && (
            <SheiAlert variant="destructive" className="mt-1">
              <SheiAlertDescription>
                {form.formState.errors[field as keyof RegistrationFormValues]?.message as string}
              </SheiAlertDescription>
            </SheiAlert>
          )}
        </div>
      ))}

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
              {form.formState.errors.password?.message as string}
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
              {form.formState.errors.confirmPassword?.message as string}
            </SheiAlertDescription>
          </SheiAlert>
        )}
      </div>

      <Button type="submit" className="w-full mt-2">
        Register
      </Button>
    </form>
  );
}
