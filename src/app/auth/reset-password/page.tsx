// app/auth/reset-password/page.tsx
// Custom password-reset landing page — the token in the URL is verified
// server-side in /api/auth/reset-password, not via a Supabase recovery
// session (see ResetPasswordForm).
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ResetPasswordForm } from "@/app/components/auth/ResetPasswordForm";
import { SheiLoader } from "@/app/components/ui/SheiLoader/loader";

function ResetPasswordWithToken() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  return <ResetPasswordForm token={token} />;
}

export default function ResetPasswordPage() {
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
          <ResetPasswordWithToken />
        </Suspense>
      </div>
    </div>
  );
}
