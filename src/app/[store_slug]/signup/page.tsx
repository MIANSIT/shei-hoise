// app/[store_slug]/signup/page.tsx
"use client";

import { SignupForm } from "./SignupForm";
import { Suspense } from "react";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading signup...</p>
        </div>
      }>
        <SignupForm />
      </Suspense>
    </div>
  );
}