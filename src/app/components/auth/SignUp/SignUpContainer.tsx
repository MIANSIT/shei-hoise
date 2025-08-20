"use client";

import { SignUpForm } from "./SignUpForm";
import { DesktopLayout } from "../../ui/sheiAuthLayout/AuthDesktop";
import { MobileLayout } from "../../ui/sheiAuthLayout/AuthMobile";
import MobileHeader from "../../common/MobileHeader";
import DesktopHeader from "../../common/DesktopHeader";
import Footer from "../../common/Footer";

export function SignUpContainer() {
  return (
    <>
      {/* Mobile Layout */}
      <div className="block md:hidden">
        <MobileHeader />
        <MobileLayout>
          <SignUpForm />
        </MobileLayout>
        <Footer />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <DesktopHeader />
        <DesktopLayout>
          <SignUpForm />
        </DesktopLayout>
        <Footer />
      </div>
    </>
  );
}
