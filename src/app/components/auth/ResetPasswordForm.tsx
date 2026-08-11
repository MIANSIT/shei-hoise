"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SheiLoader } from "../ui/SheiLoader/loader";
import { PasswordToggle } from "../common/PasswordToggle";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { KeyRound, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  token: string | null;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const { success, error } = useSheiNotification();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) return;

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        error(body?.error || "Failed to update password. Please try again.");
        return;
      }

      setIsSuccess(true);
      success("Password updated successfully!");

      const backToLoginHref =
        body?.redirectType === "admin"
          ? "/admin-login"
          : `/${body?.storeSlug}/login`;

      setTimeout(() => {
        router.push(backToLoginHref);
      }, 2000);
    } catch {
      error("Failed to update password. Please try again.");
    }
  };

  if (!token) {
    return (
      <Card className="shadow-lg border-border">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-linear-to-br from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/20 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
          </div>
          <CardTitle className="text-xl font-bold">
            Invalid or Expired Link
          </CardTitle>
          <CardDescription className="text-base">
            This password reset link is invalid or has expired. Please request a
            new one from the login page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="shadow-lg border-border">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-linear-to-br from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Password Updated!</CardTitle>
          <CardDescription className="text-base">
            Your password has been updated successfully. Redirecting to
            login...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <SheiLoader size="md" loaderColor="primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-border">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-linear-to-br from-chart-2/10 to-chart-2/20 rounded-full flex items-center justify-center">
          <KeyRound className="h-8 w-8 text-chart-2" />
        </div>
        <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Create a strong new password for your account
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2 pb-6">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="password" className="text-base font-semibold">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("password")}
                disabled={isSubmitting}
                className="pr-12"
                autoFocus
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <PasswordToggle
                  show={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  size={20}
                  className="hover:bg-accent/20"
                />
              </div>
            </div>
            {errors.password && (
              <p id="password-error" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-base font-semibold">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("confirmPassword")}
                disabled={isSubmitting}
                className="pr-12"
                aria-describedby={
                  errors.confirmPassword ? "confirm-error" : undefined
                }
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <PasswordToggle
                  show={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  size={20}
                  className="hover:bg-accent/20"
                />
              </div>
            </div>
            {errors.confirmPassword && (
              <p id="confirm-error" className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            variant="greenish"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <SheiLoader size="sm" loaderColor="white" className="mr-2" />
                Updating Password...
              </>
            ) : (
              "Update Password"
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
