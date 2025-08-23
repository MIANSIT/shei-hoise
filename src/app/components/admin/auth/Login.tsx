"use client";

import { UserForm } from "../../common/UserForm";
import { loginSchema, LoginFormValues } from "@/lib/utils/formSchema";
import { useRouter } from "next/navigation";

export default function AdminLoginComponent() {
  const router = useRouter();

  const handleAdminLogin = async (values: LoginFormValues) => {
    console.log("Admin login values:", values);
    // Call your admin login API here
    // For now we simulate login:
    await new Promise((resolve) => setTimeout(resolve, 1000));
    router.push("/dashboard"); // Redirect after successful login
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-3xl font-bold text-left mb-6">Admin Login</h1>

      <UserForm<LoginFormValues>
        schema={loginSchema}
        defaultValues={{ email: "", password: "" }}
        onSubmit={handleAdminLogin}
        submitText="Login as Admin"
        // Hide footer links for admin login
      
      />
    </div>
  );
}
