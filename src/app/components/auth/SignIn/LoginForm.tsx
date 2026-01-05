/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LoginFormType } from "@/lib/utils/formSchema";
import { UserForm } from "../../common/UserForm";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // Add supabase import

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
    }, 100);

    return () => clearTimeout(timer);
  }, [formData]);

  // ✅ Get email from localStorage or URL params
  const getEmail = () => {
    return emailFromParams || formData.email || "";
  };

  // ✅ Use LoginFormType which expects 'username' field
  const defaultValues: LoginFormType = { 
    username: getEmail(),
    password: "" 
  };

  const handleSubmit = async (values: LoginFormType) => {
    try {
      // Use Supabase auth for login
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: values.username, // username field contains the email
        password: values.password,
      });

      if (authError) {
        // Handle specific auth errors
        if (authError.message.includes("Invalid login credentials")) {
          error("Invalid email or password. Please try again.");
        } else if (authError.message.includes("Email not confirmed")) {
          error("Please verify your email address before logging in.");
        } else if (authError.message.includes("Email rate limit exceeded")) {
          error("Too many login attempts. Please try again later.");
        } else {
          error(authError.message || "Login failed. Please try again.");
        }
        return;
      }

      // ✅ Login successful
      success("Login successful!", { duration: 1000 });

      // Clear any checkout-related flags if they exist
      const { clearAccountCreationFlags } = useCheckoutStore.getState();
      clearAccountCreationFlags();

      // Add a small delay before redirecting to show the notification
      setTimeout(() => {
        // ✅ IMPORTANT: Check if we're coming from checkout
        const fromCheckout = searchParams.get("fromCheckout") === "true";
        const checkoutStoreSlug = searchParams.get("storeSlug");
        
        if (fromCheckout && checkoutStoreSlug) {
          // Redirect back to checkout with the same store slug
          router.push(`/${checkoutStoreSlug}/checkout`);
        } else {
          // Normal redirect
          router.push(redirectTo);
        }
      }, 500);

    } catch (err: any) {
      console.error("Login error:", err);
      error(err.message || "An unexpected error occurred. Please try again.");
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

      {/* ✅ Optional: Forgot password link */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            const email = getEmail();
            if (email) {
              router.push(`/reset-password?email=${encodeURIComponent(email)}`);
            } else {
              router.push('/reset-password');
            }
          }}
          className="text-sm text-primary hover:underline"
        >
          Forgot your password?
        </button>
      </div>
    </div>
  );
}