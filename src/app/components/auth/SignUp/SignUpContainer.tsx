"use client";

import { SignUpForm } from "./SignUpForm";
import { DesktopLayout } from "../../ui/sheiAuthLayout/AuthDesktop";
import { MobileLayout } from "../../ui/sheiAuthLayout/AuthMobile";
import MobileHeader from "../../common/MobileHeader";
import DesktopHeader from "../../common/DesktopHeader";

export function SignUpContainer() {
  return (
    <>
      {/* Mobile Layout */}
      <div className="block lg:hidden">
        <MobileHeader />
        <MobileLayout>
          <SignUpForm />
        </MobileLayout>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <DesktopHeader />
        <DesktopLayout>
          <SignUpForm />
        </DesktopLayout>
      </div>
    </>
  );
}
