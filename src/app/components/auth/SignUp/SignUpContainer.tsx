"use client";

import { SignUpForm } from "./SignUpForm";
import { DesktopLayout } from "../../ui/sheiAuthLayout/AuthDesktop";
import { MobileLayout } from "../../ui/sheiAuthLayout/AuthMobile";

export function SignUpContainer() {
  return (
    <>
      {/* Mobile Layout */}
      <div className="block md:hidden">
        <MobileLayout>
          <SignUpForm />
        </MobileLayout>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <DesktopLayout>
          <SignUpForm />
        </DesktopLayout>
      </div>
    </>
  );
}
