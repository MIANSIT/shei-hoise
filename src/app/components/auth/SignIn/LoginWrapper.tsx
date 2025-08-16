"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMediaQuery } from "../../../../lib/hook/use-media-query";
import { DesktopLayout } from "./LoginDesktop";
import { MobileLayout } from "./LoginMobile";
import { FormFields } from "./LoginupForm";

export function LoginWrapper() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Mobile - hidden on desktop */}
      <div className="block md:hidden">
        <MobileLayout onSubmit={onSubmit} isLoading={isLoading}>
          <FormFields />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </MobileLayout>
      </div>

      {/* Desktop - hidden on mobile */}
      <div className="hidden md:block">
        <DesktopLayout onSubmit={onSubmit} isLoading={isLoading}>
          <FormFields />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </DesktopLayout>
      </div>
    </>
  );
}
