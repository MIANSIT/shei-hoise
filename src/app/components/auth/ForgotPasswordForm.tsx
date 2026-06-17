"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { supabase } from "@/lib/supabase";
import { Mail, ArrowLeft, KeyRound } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  type: "admin" | "user";
}

export function ForgotPasswordForm({ type }: ForgotPasswordFormProps) {
  const params = useParams();
  const router = useRouter();
  const storeSlug = type === "user" ? (params.store_slug as string) : undefined;
  const { success, error } = useSheiNotification();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const t = useTranslation();

  const backToLoginHref =
    type === "admin" ? "/admin-login" : `/${storeSlug}/login`;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    const origin = window.location.origin;

    // Persist context so the /auth/update-password page knows where to redirect back
    localStorage.setItem(
      "resetPasswordContext",
      JSON.stringify({ type, storeSlug: storeSlug ?? null })
    );

    // Server-side callback route handles the PKCE code exchange.
    // Add to Supabase → Authentication → URL Configuration → Redirect URLs:
    //   http://localhost:3000/auth/callback
    //   https://www.sheihoise.com/auth/callback
    const redirectTo = `${origin}/auth/callback`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      values.email,
      { redirectTo }
    );

    if (resetError) {
      error(resetError.message || t.auth.failedSendResetEmail);
      return;
    }

    setIsSubmitted(true);
    success(t.auth.resetEmailSent);
  };

  if (isSubmitted) {
    return (
      <Card className="shadow-lg border-border">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-linear-to-br from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-green-600 dark:text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold">{t.auth.checkYourEmailTitle}</CardTitle>
          <CardDescription className="text-base">
            {t.auth.resetLinkSentPrefix}{" "}
            <strong className="text-foreground">{getValues("email")}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2 pb-6">
          <p className="text-sm text-muted-foreground text-center">
            {t.auth.resetLinkInstructions}
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.push(backToLoginHref)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.auth.backToLogin}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t.auth.didntReceive}{" "}
            <button
              type="button"
              onClick={() => setIsSubmitted(false)}
              className="text-primary hover:underline font-medium"
            >
              {t.auth.tryAgainLink}
            </button>
          </p>
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
        <CardTitle className="text-2xl font-bold">{t.auth.forgotPasswordTitle}</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          {t.auth.forgotPasswordDesc}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2 pb-6">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base font-semibold">
              {t.auth.emailAddressLabel}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t.auth.emailPlaceholder}
              {...register("email")}
              disabled={isSubmitting}
              autoFocus
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email.message}
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
                {t.auth.sendingResetLink}
              </>
            ) : (
              t.auth.sendResetLink
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.push(backToLoginHref)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.auth.backToLogin}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
