"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const isAdminLoggedIn = useAuthStore((state) => state.isAdminLoggedIn);
  const hydrated = useAuthStore((state) => state.hydrated);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    if (!hydrated) checkAuth();
  }, [checkAuth, hydrated]);

  useEffect(() => {
    if (hydrated && !isAdminLoggedIn) {
      router.replace("/admin-login");
    }
  }, [hydrated, isAdminLoggedIn, router]);

  if (!hydrated || !isAdminLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Checking admin authentication...
      </div>
    );
  }

  return <>{children}</>;
}
