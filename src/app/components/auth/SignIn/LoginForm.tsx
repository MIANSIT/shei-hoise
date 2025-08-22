"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginFormValues } from "../../../../lib/utils/formSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { SheiLoader } from "../../ui/SheiLoader/loader";
import { PasswordToggle } from "../../common/PasswordToggle";

export function LoginForm() {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const notify = useSheiNotification();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      console.log("Login values:", values);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      notify.success("Logged in successfully!");
      router.push(redirect);
    } catch {
      notify.warning("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-left text-white">Welcome back</h1>
        <p className="mt-2 text-gray-400 text-left">
          Enter your credentials to access your account
        </p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                {...form.register("email")}
                placeholder="Email"
                type="email"
                disabled={isLoading}
              />
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
                  placeholder="Password"
                  disabled={isLoading}
                  className="pr-14" // extra padding for toggle
                />
                <div className="absolute inset-y-0 right-2 flex items-center">
                  <PasswordToggle
                    show={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                  />
                </div>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.password.message}
                </p>
              )}
              <div className="text-right mt-1">
                <Link
                  href="/forgot-password"
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors duration-200"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full mt-2 relative overflow-hidden"
              disabled={isLoading}
            >
              {isLoading ? (
                <SheiLoader
                  size="sm"
                  loaderColor="black"
                  loadingText="Signing in..."
                />
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-gray-400">
            Don&apos;t have an account?{" "}
            <Link
              href={`/sign-up?redirect=${encodeURIComponent(redirect)}`}
              className="text-white hover:underline"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
