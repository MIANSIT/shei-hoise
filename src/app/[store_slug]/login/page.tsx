// app/[store_slug]/login/page.tsx
"use client";

import { LoginForm } from "./LoginForm";
import { Suspense } from "react";
import { useTranslation } from "@/lib/hook/useTranslation";

export default function LoginPage() {
  const t = useTranslation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.auth.loadingText}</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}