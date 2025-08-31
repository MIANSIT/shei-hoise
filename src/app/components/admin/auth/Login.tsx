"use client";

import { useEffect } from "react";
import { UserForm } from "../../common/UserForm";
import { loginSchema, LoginFormValues } from "@/lib/utils/formSchema";
import { useRouter } from "next/navigation";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification"; 
import { useAuthStore } from "@/lib/store/authStore";

export default function AdminLoginPage() {
  const router = useRouter();
  const { success, error } = useSheiNotification();
  const isAdminLoggedIn = useAuthStore((state) => state.isAdminLoggedIn);
  const hydrated = useAuthStore((state) => state.hydrated);

  // ✅ Call checkAuth inside useEffect without passing it as dependency
  useEffect(() => {
    const check = async () => {
      const store = useAuthStore.getState();
      if (!store.hydrated) {
        await store.checkAuth();
      }
    };
    check();
  }, []); // stable, no dynamic deps

  useEffect(() => {
    if (hydrated && isAdminLoggedIn) {
      router.replace("/dashboard");
    }
  }, [hydrated, isAdminLoggedIn, router]);

  const handleAdminLogin = async (values: LoginFormValues) => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        credentials: "include",
      });

      if (res.ok) {
        success("Admin Login successful!", { duration: 1000 });
        const store = useAuthStore.getState();
        await store.checkAuth();
        router.replace("/dashboard");
      } else {
        error("Invalid admin credentials");
      }
    } catch (err) {
      console.error(err);
      error("Login failed. Please try again.");
    }
  };

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Checking admin authentication...
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-3xl font-bold text-left mb-6">Admin Login</h1>
      <UserForm<LoginFormValues>
        schema={loginSchema}
        defaultValues={{ email: "", password: "" }}
        onSubmit={handleAdminLogin}
        submitText="Login as Admin"
      />
    </div>
  );
}
