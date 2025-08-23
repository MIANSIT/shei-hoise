"use client";

import Image from "next/image";

interface DesktopLayoutProps {
  children: React.ReactNode;
  isAdmin?: boolean;
}

export function DesktopLayout({ children, isAdmin = false }: DesktopLayoutProps) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left side - Image */}
      <div className="hidden md:flex w-1/2 h-screen relative items-center justify-center">
        <Image
          src={isAdmin ? "/adminBg.png" : "/bgImage.png"}
          alt={isAdmin ? "Admin background" : "Login background"}
          fill
          className="object-contain" // image fits entirely, no crop
          style={{ objectPosition: "center" }} // center the image
          priority
          quality={100}
        />
      </div>

      {/* Right side - Form */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-black p-8">
        <div className="w-full max-w-md space-y-8">{children}</div>
      </div>
    </div>
  );
}
