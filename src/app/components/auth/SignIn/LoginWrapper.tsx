"use client";

import { DesktopLayout } from "../../ui/sheiAuthLayout/AuthDesktop";
import { MobileLayout } from "../../ui/sheiAuthLayout/AuthMobile";
import { LoginForm } from "./LoginForm";

export function LoginWrapper() {
  return (
    <>
      {/* Mobile Layout */}
      <div className="block md:hidden">
        <MobileLayout>
          <LoginForm />
        </MobileLayout>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <DesktopLayout>
          <LoginForm />
        </DesktopLayout>
      </div>
    </>
  );
}
