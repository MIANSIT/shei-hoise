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
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

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
  const notify = useSheiNotification(); // Use custom toast hook

  const handleSubmit = async (values: SignUpFormValues) => {
    setIsLoading(true);
    try {
      console.log("Signup values:", values);
      internalForm.reset();

      // Success toast
      notify.success("Shei Hoise Account created successfully!", { duration: 3000 });
    } catch (error) {
      console.error("Signup failed:", error);

      // Error toast
      notify.error(
        "Shei Hoise Account creation failed. Please try again.",
        { duration: 4000 }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-left text-white">Create Account</h1>
        <p className="mt-2 text-gray-400 text-left">
          Enter your details to create your account
        </p>
      </div>

      {/* Card */}
      <Card>
        <CardContent>
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
                placeholder="Full Name"
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
                placeholder="Email"
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
                  placeholder="Password"
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
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-white font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
