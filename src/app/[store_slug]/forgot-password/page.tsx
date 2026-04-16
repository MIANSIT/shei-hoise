// app/[store_slug]/forgot-password/page.tsx
"use client";

import { Suspense } from "react";
import { ForgotPasswordForm } from "@/app/components/auth/ForgotPasswordForm";
import { SheiLoader } from "@/app/components/ui/SheiLoader/loader";

export default function StoreForgotPasswordPage() {
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
          <ForgotPasswordForm type="user" />
        </Suspense>
      </div>
    </div>
  );
}
