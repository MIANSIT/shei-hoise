"use client";

import Footer from "../../common/Footer";
import { DesktopLayout } from "../../layout/auth/AuthDesktop";
import { MobileLayout } from "../../layout/auth/AuthMobile";
import AdminLoginComponent from "./Login";

export default function LoginWrapper() {
  return (
    <>
      {/* Mobile Layout */}
      <div className="block md:hidden">
        <MobileLayout>
          <AdminLoginComponent />
        </MobileLayout>
        <Footer />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <DesktopLayout isAdmin={true}>
          <AdminLoginComponent />
        </DesktopLayout>
        <Footer />
      </div>
    </>
  );
}
