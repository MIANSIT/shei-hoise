"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  signUpSchema,
  SignUpFormValues,
} from "../../../../lib/utils/formSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation"; // Import useRouter

export function SignUpForm() {
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const notify = useSheiNotification();
  const router = useRouter(); // Initialize router

  const onSubmit = async (values: SignUpFormValues) => {
    setIsLoading(true);
    try {
      console.log("Signup values:", values);
      form.reset();
      notify.success("Account created successfully!");
      
      // Redirect to login page after success
      router.push("/login");
    } catch {
      notify.warning("Account creation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-left text-white">Create Account</h1>
        <p className="mt-2 text-gray-400 text-left">
          Enter your details to create your account
          Enter your details to create your account
        </p>
      </div>
      <Card>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input {...form.register("name")} placeholder="Full Name" />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input {...form.register("email")} placeholder="Email" type="email" />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="grid gap-2 relative">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  {...form.register("password")}
                  type={showPassword ? "text" : "password"}
                  className="pr-10"
                  placeholder="Password"
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
