"use client";

import DesktopHeader from "../../common/DesktopHeader";
import Footer from "../../common/Footer";
import MobileHeader from "../../common/MobileHeader";
import { DesktopLayout } from "../../ui/sheiAuthLayout/AuthDesktop";
import { MobileLayout } from "../../ui/sheiAuthLayout/AuthMobile";
import { LoginForm } from "./LoginForm";

export function LoginWrapper() {
  return (
    <>
      {/* Mobile Layout */}
      <div className="block md:hidden">
        <MobileHeader />
        <MobileLayout>
          <LoginForm />
        </MobileLayout>
        <Footer />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <DesktopHeader />
        <DesktopLayout>
          <LoginForm />
        </DesktopLayout>
        <Footer />
      </div>
    </>
  );
}
