"use client";

import { UserForm } from "../../common/UserForm";
import { loginSchema, LoginFormValues } from "@/lib/utils/formSchema";
import { useRouter } from "next/navigation";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification"; // Adjust the import path as needed

export default function AdminLoginComponent() {
  const router = useRouter();
  const { success, error } = useSheiNotification();

  const handleAdminLogin = async (values: LoginFormValues) => {
    try {
      console.log("Admin login values:", values);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Replace this with actual API call logic
      const isSuccess = true; // Simulate success
      
      if (isSuccess) {
        success("Admin Login successful!",{ duration: 1000 });
        setTimeout(() => router.push("/dashboard"), 500);
      } else {
        error("Invalid admin credentials");
      }
    } catch (err) {
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