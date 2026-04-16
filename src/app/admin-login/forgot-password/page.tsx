// app/admin-login/forgot-password/page.tsx
"use client";

import { Suspense } from "react";
import { DesktopLayout } from "@/app/components/layout/auth/AuthDesktop";
import { MobileLayout } from "@/app/components/layout/auth/AuthMobile";
import { ForgotPasswordForm } from "@/app/components/auth/ForgotPasswordForm";
import { SheiLoader } from "@/app/components/ui/SheiLoader/loader";

export default function AdminForgotPasswordPage() {
  return (
    <>
      {/* Mobile */}
      <div className="block md:hidden">
        <MobileLayout>
          <Suspense fallback={<SheiLoader size="md" loadingText="Loading..." />}>
            <ForgotPasswordForm type="admin" />
          </Suspense>
        </MobileLayout>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <DesktopLayout isAdmin={true}>
          <Suspense fallback={<SheiLoader size="md" loadingText="Loading..." />}>
            <ForgotPasswordForm type="admin" />
          </Suspense>
        </DesktopLayout>
      </div>
    </>
  );
}
