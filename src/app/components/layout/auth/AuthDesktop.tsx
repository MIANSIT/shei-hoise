"use client";

import Image from "next/image";
import { AdminAuthIllustration } from "./AdminAuthIllustration";

interface DesktopLayoutProps {
  children: React.ReactNode;
  isAdmin?: boolean;
}

export function DesktopLayout({
  children,
  isAdmin = false,
}: DesktopLayoutProps) {
  return (
    <div className="flex  w-full">
      {/* Left side - Image */}
      <div className="hidden md:flex w-2/3 h-screen relative items-center justify-center overflow-hidden">
        {isAdmin ? (
          <AdminAuthIllustration />
        ) : (
          <Image
            src="/bgImage.png"
            alt="Login background"
            fill
            className="object-cover" // image fits entirely, no crop
            priority
            quality={100}
          />
        )}
      </div>

      {/* Right side - Form */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-background p-8">
        <div className="w-full max-w-md space-y-8">{children}</div>
      </div>
    </div>
  );
}
