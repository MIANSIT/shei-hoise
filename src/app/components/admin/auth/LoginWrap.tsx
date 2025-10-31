// components/admin/auth/LoginWrap.tsx
"use client";

import { Suspense } from "react";
import { DesktopLayout } from "../../layout/auth/AuthDesktop";
import { MobileLayout } from "../../layout/auth/AuthMobile";
import AdminLoginComponent from "./Login";
import { SheiLoader } from "../../ui/SheiLoader/loader";

export default function LoginWrapper() {
  return (
    <>
      {/* Mobile Layout */}
      <div className="block md:hidden">
        <MobileLayout>
          <Suspense fallback={<SheiLoader size="md" loadingText="Loading..." />}>
            <AdminLoginComponent />
          </Suspense>
        </MobileLayout>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <DesktopLayout isAdmin={true}>
          <Suspense fallback={<SheiLoader size="md" loadingText="Loading..." />}>
            <AdminLoginComponent />
          </Suspense>
        </DesktopLayout>
      </div>
    </>
  );
}