/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import { refreshCustomerData } from "@/lib/hook/useCurrentCustomer";
import {
  authQueries,
  CustomerData,
} from "@/lib/queries/customerAuth/customerLogin";
import { EmailStep } from "../../components/auth/Customer/EmailStep";
import { PasswordStep } from "../../components/auth/Customer/PasswordStep";
import { LoadingStep } from "../../components/auth/Customer/LoadingStep";
import { SheiLoader } from "../../components/ui/SheiLoader/loader";
import { supabase } from "@/lib/supabase";
import { linkAuthToCustomer } from "@/lib/queries/customers/getCustomerByEmail";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Auth } from "@supabase/auth-ui-react";

type Step = "email" | "password" | "loading";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const emailFromParams = searchParams.get("email");

  const storeSlug = params.store_slug as string;
  const redirectParam = searchParams.get("redirect");
  const fromCheckout = searchParams.get("fromCheckout") === "true";

  const getRedirectUrl = () => {
    if (redirectParam) return redirectParam;
    if (fromCheckout) return `/${storeSlug}/checkout`;
    return `/${storeSlug}`;
  };

  const redirectTo = getRedirectUrl();
  const { success, error, info } = useSheiNotification();
  const { formData } = useCheckoutStore();

  const [isStoreLoaded, setIsStoreLoaded] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);

  // Store current page as previous page
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("preLoginPage", window.location.pathname);
    }
  }, []);

  // Pre-fill email
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStoreLoaded(true);
      const storedEmail = emailFromParams || formData.email || "";
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [formData, emailFromParams]);

  // Check email function
  const checkEmail = async () => {
    if (!email || !email.includes("@")) {
      error("Please enter a valid email address");
      return;
    }

    setIsCheckingEmail(true);
    setStep("loading");

    try {
      const customer = await authQueries.checkEmail(email);

      if (!customer) {
        info("No account found with this email");
        setTimeout(() => {
          router.push(
            `/${storeSlug}/signup?email=${encodeURIComponent(email)}`
          );
        }, 1000);
        return;
      }

      setCustomerData(customer);

      if (customer.auth_user_id) {
        success("Account found! Please enter your password");
        setStep("password");
      } else {
        info("Account found but needs setup");
        setTimeout(() => {
          router.push(
            `/${storeSlug}/complete-account?email=${encodeURIComponent(
              email
            )}&customer_id=${customer.id}`
          );
        }, 1000);
      }
    } catch (err: any) {
      console.error("Error checking email:", err);
      error("Failed to check email. Please try again.");
      setStep("email");
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Handle login function - UPDATED TO LINK AUTH_USER_ID
  const handleLogin = async () => {
    if (!password || password.length < 6) {
      error("Please enter your password (minimum 6 characters)");
      return;
    }

    setIsLoggingIn(true);

    try {
      // 1. Login with Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.toLowerCase(),
          password: password,
        });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          throw new Error("Invalid password. Please try again.");
        } else if (authError.message.includes("Email not confirmed")) {
          throw new Error(
            "Please verify your email address before logging in."
          );
        } else {
          throw authError;
        }
      }

      if (!authData.user) {
        throw new Error("Login failed. Please try again.");
      }

      // 2. Get the auth user ID
      const authUserId = authData.user.id;

      // 3. Check if customer already has auth_user_id linked
      if (customerData) {
        if (!customerData.auth_user_id) {
          const linked = await linkAuthToCustomer(customerData.id, authUserId);
          if (linked) {
          } else {
            console.warn("⚠️ Failed to link auth user to customer");
          }
        }

        // Also check for any other customers with same email that need linking
        try {
          const { data: otherCustomers } = await supabase
            .from("store_customers")
            .select("id, auth_user_id")
            .eq("email", email.toLowerCase())
            .neq("id", customerData.id);

          if (otherCustomers && otherCustomers.length > 0) {
            // Link auth_user_id to all customers with this email
            for (const customer of otherCustomers) {
              if (!customer.auth_user_id) {
                await linkAuthToCustomer(customer.id, authUserId);
              }
            }
          }
        } catch (linkError) {
          console.error("Error linking other customers:", linkError);
        }
      }

      success("Login successful!", { duration: 1000 });
      refreshCustomerData();

      const { clearAccountCreationFlags } = useCheckoutStore.getState();
      clearAccountCreationFlags();

      // Redirect
      setTimeout(() => {
        let finalRedirectUrl = redirectTo;
        if (typeof window !== "undefined") {
          const preLoginPage = sessionStorage.getItem("preLoginPage");
          if (preLoginPage && !preLoginPage.includes("/login")) {
            finalRedirectUrl = preLoginPage;
          }
        }
        router.push(finalRedirectUrl);
      }, 800);
    } catch (err: any) {
      console.error("Login error:", err);
      error(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Reset to email step
  const resetToEmail = () => {
    setStep("email");
    setPassword("");
    setCustomerData(null);
  };

  // Handle signup redirect
  const handleSignup = () => {
    router.push(
      `/${storeSlug}/signup${
        email ? `?email=${encodeURIComponent(email)}` : ""
      }`
    );
  };

  if (!isStoreLoaded) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        <div className='text-center'>
          <SheiLoader size='lg' loaderColor='primary' />
          <p className='mt-4 text-muted-foreground'>
            Loading your information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-md mx-auto w-full'>
      {step === "email" && (
        <EmailStep
          email={email}
          setEmail={setEmail}
          onNext={checkEmail}
          onSignup={handleSignup}
          isCheckingEmail={isCheckingEmail}
          storeSlug={storeSlug}
        />
      )}

      {step === "password" && customerData && (
        <PasswordStep
          customerData={customerData}
          password={password}
          setPassword={setPassword}
          onLogin={handleLogin}
          onBack={resetToEmail}
          isLoggingIn={isLoggingIn}
        />
      )}

      {step === "loading" && (
        <LoadingStep
          message={isCheckingEmail ? "Checking Your Account" : "Processing..."}
          description='Please wait a moment'
        />
      )}
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={["google"]} // Only show Google login
        onlyThirdPartyProviders // Hide email/password option
        redirectTo={`${window.location.origin}/auth/callback`}
      />
    </div>
  );
}
