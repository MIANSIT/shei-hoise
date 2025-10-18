"use client";

import { SignUpForm } from "./SignUpForm";
import { DesktopLayout } from "../../layout/auth/AuthDesktop";
import { MobileLayout } from "../../layout/auth/AuthMobile";
import MobileHeader from "../../common/MobileHeader";
import DesktopHeader from "../../common/DesktopHeader";
import Footer from "../../common/Footer";
import { Suspense } from "react";
import { Spin } from "antd";

export function SignUpContainer() {
  return (
    <>
      {/* Mobile Layout */}
      <div className='block md:hidden'>
        <MobileHeader />
        <MobileLayout>
          <Suspense fallback={<Spin />}>
            <SignUpForm />
          </Suspense>
        </MobileLayout>
        <Footer />
      </div>

      {/* Desktop Layout */}
      <div className='hidden md:block'>
        <DesktopHeader />
        <DesktopLayout>
          <Suspense fallback={<Spin />}>
            <SignUpForm />
          </Suspense>{" "}
        </DesktopLayout>
        <Footer />
      </div>
    </>
  );
}
