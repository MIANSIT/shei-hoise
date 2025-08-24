"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isAdminLoggedIn = useAuthStore((state) => state.isAdminLoggedIn);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait until Zustand store rehydrates from localStorage
  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onHydrate(() => {
      setIsHydrated(true);
    });

    // If already hydrated, mark true
    if (typeof window !== "undefined") setIsHydrated(true);

    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    if (isHydrated && !isAdminLoggedIn) {
      router.replace("/admin-login");
    }
  }, [isAdminLoggedIn, isHydrated, router]);

  if (!isHydrated || !isAdminLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Checking authentication...
      </div>
    );
  }

  return <>{children}</>;
}
