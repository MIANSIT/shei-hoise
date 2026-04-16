// app/auth/update-password/page.tsx
// The PKCE code is exchanged server-side in /auth/callback/route.ts.
// By the time the browser lands here the session cookie is already set.
// This page just reads the stored context and renders the update-password form.
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { UpdatePasswordForm } from "@/app/components/auth/UpdatePasswordForm";
import { SheiLoader } from "@/app/components/ui/SheiLoader/loader";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ResetContext {
  type: "admin" | "user";
  storeSlug: string | null;
}

function UpdatePasswordWithContext() {
  const searchParams = useSearchParams();
  const [context, setContext] = useState<ResetContext | null>(null);

  // If the callback route failed it appends ?error=link_expired
  const hasError = searchParams.get("error") === "link_expired";

  useEffect(() => {
    let resolved: ResetContext = { type: "admin", storeSlug: null };
    try {
      const raw = localStorage.getItem("resetPasswordContext");
      if (raw) {
        resolved = JSON.parse(raw) as ResetContext;
        localStorage.removeItem("resetPasswordContext");
      }
    } catch {
      // keep default
    }
    setContext(resolved);
  }, []);

  if (!context) {
    return (
      <div className="flex justify-center">
        <SheiLoader size="md" loadingText="Loading..." />
      </div>
    );
  }

  if (hasError) {
    const forgotHref =
      context.type === "admin"
        ? "/admin-login/forgot-password"
        : `/${context.storeSlug}/forgot-password`;

    return (
      <Card className="shadow-lg border-border">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-linear-to-br from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/20 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
          </div>
          <CardTitle className="text-xl font-bold">Link Expired</CardTitle>
          <CardDescription className="text-base">
            This password reset link has expired or was already used. Please
            request a new one.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <Button
            type="button"
            variant="greenish"
            className="w-full"
            onClick={() => (window.location.href = forgotHref)}
          >
            Request New Reset Link
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <UpdatePasswordForm
      type={context.type}
      storeSlug={context.storeSlug ?? undefined}
    />
  );
}

export default function AuthUpdatePasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="flex justify-center">
              <SheiLoader size="md" loadingText="Loading..." />
            </div>
          }
        >
          <UpdatePasswordWithContext />
        </Suspense>
      </div>
    </div>
  );
}
