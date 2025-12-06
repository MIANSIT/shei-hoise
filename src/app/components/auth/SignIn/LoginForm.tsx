"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LoginFormType } from "@/lib/utils/formSchema"; // ✅ Use LoginFormType instead of LoginFormValues
import { UserForm } from "../../common/UserForm";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import { useEffect, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const emailFromParams = searchParams.get("email");
  const { success, error } = useSheiNotification();
  
  const { formData } = useCheckoutStore();
  const [isStoreLoaded, setIsStoreLoaded] = useState(false);

  // ✅ Wait for store to be hydrated from localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStoreLoaded(true);
      console.log("Store data loaded for login:", formData);
    }, 100);

    return () => clearTimeout(timer);
  }, [formData]);

  // ✅ Get email from localStorage or URL params
  const getEmail = () => {
    // Priority: URL params > localStorage > empty string
    return emailFromParams || formData.email || "";
  };

  // ✅ Use LoginFormType which expects 'username' field, not 'email'
  const defaultValues: LoginFormType = { 
    username: getEmail(), // ✅ Use 'username' field instead of 'email'
    password: "" 
  };

  const handleSubmit = async (values: LoginFormType) => { // ✅ Use LoginFormType here
    try {
      // Simulate API call
      await new Promise((res) => setTimeout(res, 1000));

      // Simulate successful login
      success("Login successful!", { duration: 1000 });

      // Add a small delay before redirecting to show the notification
      setTimeout(() => {
        router.push(redirectTo);
      }, 500);
    } catch {
      // Handle login error
      error("Login failed. Please check your credentials and try again.");
    }
  };

  // Show loading while store is being hydrated
  if (!isStoreLoaded) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your information...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className='text-center mb-6'>
        <h1 className='text-4xl font-bold text-left text-foreground'>
          Welcome back
        </h1>
        <p className='mt-2 text-muted-foreground text-left'>
          Enter your credentials to access your account
        </p>
        
        {/* ✅ ALWAYS show this section - no conditional rendering */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          {getEmail() ? (
            <p className="text-sm text-blue-700">
              ✅ Your email <strong>{getEmail()}</strong> has been pre-filled.
              {emailFromParams && " (from link)"}
              {!emailFromParams && formData.email && " (from checkout)"}
            </p>
          ) : (
            <p className="text-sm text-blue-700">
              🔐 Enter your email and password to sign in to your account.
            </p>
          )}
        </div>
      </div>

      <UserForm 
        submitText='Sign In' 
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        mode="login"
      />
    </div>
  );
}