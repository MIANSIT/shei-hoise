import { Button } from "@/components/ui/button";
import Image from "next/image";

export function DesktopLayout({
  children,
  onSubmit,
  isLoading,
}: {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}) {
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
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl  text-left font-bold tracking-tight text-white">
              Welcome back
            </h1>
            <p className="mt-4  text-left text-lg text-gray-400">
              Enter your details to sign in to your account
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-4">{children}</div>

            <Button
              type="submit"
              className="w-full h-12 text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="text-center text-base text-gray-400">
            Don&apos;t have an account?{" "}
            <a
              href="/signUp"
              className="font-medium text-white hover:underline text-sm"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
