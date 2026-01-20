"use client";

import Image from "next/image";

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
      <div className="hidden md:flex w-1/2 h-screen relative items-center justify-center">
        <Image
          src={isAdmin ? "/adminBGi.png" : "/bgImage.png"}
          alt={isAdmin ? "Admin background" : "Login background"}
          fill
          className="object-cover" // image fits entirely, no crop
          priority
          quality={100}
        />
      </div>

      {/* Right side - Form */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-background p-8">
        <div className="w-full max-w-md space-y-8">{children}</div>
      </div>
    </div>
  );
}
