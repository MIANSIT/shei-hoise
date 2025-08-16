"use client";

import { DesktopLayout } from "../../ui/sheiAuthLayout/AuthDesktop";
import { MobileLayout } from "../../ui/sheiAuthLayout/AuthMobile";
import { FormFields } from "./LoginupForm";

export function LoginWrapper() {
  return (
    <>
      {/* Mobile Layout */}
      <div className="block md:hidden">
        <MobileLayout>
          <FormFields />
        </MobileLayout>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <DesktopLayout>
          <FormFields />
        </DesktopLayout>
      </div>
    </>
  );
}
