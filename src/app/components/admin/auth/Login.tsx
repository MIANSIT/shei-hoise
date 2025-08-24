"use client";

import { UserForm } from "../../common/UserForm";
import { loginSchema, LoginFormValues } from "@/lib/utils/formSchema";
import { useRouter } from "next/navigation";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification"; 
import { useAuthStore } from "@/lib/store/authStore"; // ✅ import Zustand store

export default function AdminLoginComponent() {
  const router = useRouter();
  const { success, error } = useSheiNotification();
  const login = useAuthStore((state) => state.login); // ✅ grab login function from store

  // 🔑 Default credentials (you can change these later or move to env vars)
  const DEFAULT_ADMIN = {
    email: "admin@sheihoise.com",
    password: "admin123",
  };

  const handleAdminLogin = async (values: LoginFormValues) => {
    try {
      console.log("Admin login values:", values);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // ✅ Simple check for hardcoded credentials
      if (
        values.email === DEFAULT_ADMIN.email &&
        values.password === DEFAULT_ADMIN.password
      ) {
        login(); // ✅ set Zustand auth state
        success("Admin Login successful!", { duration: 1000 });

        setTimeout(() => {
          router.push("/dashboard"); // ✅ redirect to protected dashboard
        }, 500);
      } else {
        error("Invalid admin credentials");
      }
    } catch {
      error("Login failed. Please try again.");
    }
  };

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
