"use client";

import { Suspense } from "react";
import DesktopHeader from "../../common/DesktopHeader";
import Footer from "../../common/Footer";
import MobileHeader from "../../common/MobileHeader";
import { DesktopLayout } from "../../layout/auth/AuthDesktop";
import { MobileLayout } from "../../layout/auth/AuthMobile";
import { LoginForm } from "./LoginForm";
import { Spin } from "antd";

export function LoginWrapper() {
  return (
    <>
      {/* Mobile Layout */}
      <div className='block md:hidden'>
        <MobileHeader />
        <MobileLayout>
          <Suspense fallback={<Spin />}>
            <LoginForm />
          </Suspense>
        </MobileLayout>
        <Footer />
      </div>

      {/* Desktop Layout */}
      <div className='hidden md:block'>
        <DesktopHeader />
        <DesktopLayout isAdmin={false}>
          <Suspense fallback={<Spin />}>
            <LoginForm />
          </Suspense>
        </DesktopLayout>
        <Footer />
      </div>
    </>
  );
}
