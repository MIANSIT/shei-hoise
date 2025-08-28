"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const isAdminLoggedIn = useAuthStore((state) => state.isAdminLoggedIn);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand rehydration
  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onHydrate(() => {
      setIsHydrated(true);
    });

    // If already hydrated, mark true
    if (typeof window !== "undefined") setIsHydrated(true);

    return () => unsubscribe?.();
  }, []);

  // Redirect if admin is not logged in
  useEffect(() => {
    if (isHydrated && !isAdminLoggedIn) {
      router.replace("/admin-login");
    }
  }, [isAdminLoggedIn, isHydrated, router]);

  if (!isHydrated || !isAdminLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Checking admin authentication...
      </div>
    );
  }

  return <>{children}</>;
}
