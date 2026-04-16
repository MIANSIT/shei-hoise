// app/[store_slug]/update-password/page.tsx
"use client";

import { Suspense } from "react";
import { UpdatePasswordForm } from "@/app/components/auth/UpdatePasswordForm";
import { SheiLoader } from "@/app/components/ui/SheiLoader/loader";

export default function StoreUpdatePasswordPage() {
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
          <UpdatePasswordForm type="user" />
        </Suspense>
      </div>
    </div>
  );
}
