import Image from "next/image";

export function DesktopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full">
      {/* Left side - Image */}
      <div className="hidden w-1/2 md:block">
        <div className="relative h-full w-full">
          <Image
            src="/bgImage.png"
            alt="Login background"
            fill
            className="object-cover"
            priority
            quality={100}
          />
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full items-center justify-center bg-black p-8 md:w-1/2">
        <div className="w-full max-w-md space-y-8">{children}</div>
      </div>
    </div>
  );
}
