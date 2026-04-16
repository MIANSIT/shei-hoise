// app/auth/update-password/page.tsx
//
// Universal password-reset landing page (PKCE flow).
//
// Supabase redirects here with ?code=... after the user clicks the email link.
// This page exchanges the code for a session, then renders the update-password form.
//
// ─── Supabase Dashboard setup ────────────────────────────────────────────────
//  Authentication → URL Configuration → Redirect URLs — add ALL of these:
//    https://www.sheihoise.com/auth/update-password   (production)
//    http://localhost:3000/auth/update-password       (local dev)
//    http://localhost:3001/auth/update-password       (if you use a different port)
// ─────────────────────────────────────────────────────────────────────────────
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
import { supabase } from "@/lib/supabase";

interface ResetContext {
  type: "admin" | "user";
  storeSlug: string | null;
}

function UpdatePasswordWithContext() {
  const searchParams = useSearchParams();
  const [context, setContext] = useState<ResetContext | null>(null);
  const [ready, setReady] = useState(false);
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Restore context saved by ForgotPasswordForm
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

    // 2. Exchange the PKCE ?code= for a Supabase session
    const code = searchParams.get("code");
    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            setExchangeError(error.message);
          }
          setReady(true);
        });
    } else {
      // No code in URL — let UpdatePasswordForm handle session detection
      // (handles the case where user navigates here directly with a valid session)
      setReady(true);
    }
  }, [searchParams]);

  if (!context || !ready) {
    return (
      <div className="flex justify-center">
        <SheiLoader size="md" loadingText="Verifying reset link..." />
      </div>
    );
  }

  // Code exchange failed — show error with retry link derived from context
  if (exchangeError) {
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
            This password reset link has expired or was already used.
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
              <SheiLoader size="md" loadingText="Verifying reset link..." />
            </div>
          }
        >
          <UpdatePasswordWithContext />
        </Suspense>
      </div>
    </div>
  );
}
