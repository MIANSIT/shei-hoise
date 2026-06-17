// app/[store_slug]/forgot-password/page.tsx
"use client";

import { Suspense } from "react";
import { ForgotPasswordForm } from "@/app/components/auth/ForgotPasswordForm";
import { SheiLoader } from "@/app/components/ui/SheiLoader/loader";
import { useTranslation } from "@/lib/hook/useTranslation";

export default function StoreForgotPasswordPage() {
  const t = useTranslation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="flex justify-center">
              <SheiLoader size="md" loadingText={t.auth.loadingText} />
            </div>
          }
        >
          <ForgotPasswordForm type="user" />
        </Suspense>
      </div>
    </div>
  );
}
