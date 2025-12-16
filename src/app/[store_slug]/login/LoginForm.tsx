/* eslint-disable @typescript-eslint/no-explicit-any */
// app/[store_slug]/login/LoginForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheiLoader } from "../../components/ui/SheiLoader/loader";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Lock, Mail, CheckCircle, UserPlus, ArrowLeft, Shield, LogIn } from "lucide-react";
import { refreshCustomerData } from "@/lib/hook/useCurrentCustomer";
import { PasswordToggle } from "../../components/common/PasswordToggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [step, setStep] = useState<"email" | "password" | "loading">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [customerData, setCustomerData] = useState<{
    id: string;
    email: string;
    auth_user_id: string | null;
    store_slugs: string[];
  } | null>(null);

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

  // Check email
  const checkEmail = async () => {
    if (!email || !email.includes("@")) {
      error("Please enter a valid email address");
      return;
    }

    setIsCheckingEmail(true);
    setStep("loading");

    try {
      const { data: customers, error: fetchError } = await supabase
        .from("store_customers")
        .select(`
          id,
          email,
          auth_user_id,
          store_customer_links!inner(
            stores!inner(
              store_slug
            )
          )
        `)
        .eq("email", email.toLowerCase())
        .limit(1);

      if (fetchError) throw fetchError;

      if (!customers || customers.length === 0) {
        info("No account found with this email");
        setTimeout(() => {
          router.push(`/${storeSlug}/signup?email=${encodeURIComponent(email)}`);
        }, 1000);
        return;
      }

      const customer = customers[0];
      const storeSlugs = customer.store_customer_links?.map(
        (link: any) => link.stores?.store_slug
      ).filter(Boolean) || [];

      setCustomerData({
        id: customer.id,
        email: customer.email,
        auth_user_id: customer.auth_user_id,
        store_slugs: storeSlugs,
      });

      if (customer.auth_user_id) {
        success("Account found! Please enter your password");
        setStep("password");
      } else {
        info("Account found but needs setup");
        setTimeout(() => {
          router.push(`/${storeSlug}/complete-account?email=${encodeURIComponent(email)}&customer_id=${customer.id}`);
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

  // Handle login
  const handleLogin = async () => {
    if (!password || password.length < 6) {
      error("Please enter your password (minimum 6 characters)");
      return;
    }

    setIsLoggingIn(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          error("Invalid password. Please try again.");
        } else if (authError.message.includes("Email not confirmed")) {
          error("Please verify your email address before logging in.");
        } else {
          error(authError.message || "Login failed. Please try again.");
        }
        return;
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
      error(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (step === "email") checkEmail();
      else if (step === "password") handleLogin();
    }
  };

  // Reset to email step
  const resetToEmail = () => {
    setStep("email");
    setPassword("");
    setCustomerData(null);
  };

  if (!isStoreLoaded) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <SheiLoader size="lg" loaderColor="primary" />
          <p className="mt-4 text-muted-foreground">Loading your information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto w-full">
      {/* Step 1: Email Input */}
      {step === "email" && (
        <Card className="w-full max-w-xl shadow-xl border-border/40">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-chart-2/10 to-chart-2/20 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-chart-2" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Enter your email to access your account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-semibold">
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="you@example.com"
                  className="text-base pr-12"
                  disabled={isCheckingEmail}
                  autoFocus
                />
                <Button
                  type="button"
                  onClick={checkEmail}
                  disabled={!email || !email.includes("@") || isCheckingEmail}
                  className="absolute right-1 top-1 h-10 w-10 p-0"
                  size="sm"
                  variant={"greenish"}
                >
                  {isCheckingEmail ? (
                    <SheiLoader size="sm" loaderColor="white" />
                  ) : (
                    <ArrowRight className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                We&apos;ll check if you have an existing account
              </p>
            </div>

            <div className="p-4 bg-chart-2/5 rounded-lg border border-chart-2/20">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-foreground">
                <CheckCircle className="h-4 w-4 text-chart-2" />
                What happens next:
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-chart-2"></div>
                  We&apos;ll check your email in our system
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-chart-2"></div>
                  If account exists, you&apos;ll enter password
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-chart-2"></div>
                  If not, you&apos;ll be redirected to sign up
                </li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-6 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Don&apos;t have an account yet?
              </p>
              <Button
                type="button"
                onClick={() => {
                  router.push(`/${storeSlug}/signup${email ? `?email=${encodeURIComponent(email)}` : ""}`);
                }}
                variant="outline"
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create New Account
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Password Input */}
      {step === "password" && customerData && (
        <Card className="shadow-lg border-border">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Enter Password
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              For your account <strong className="text-foreground">{customerData.email}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-semibold">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="••••••••"
                  className="h-12 text-base pr-12"
                  disabled={isLoggingIn}
                  autoFocus
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <PasswordToggle
                    show={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                    size={20}
                    className="hover:bg-accent/20"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter the password for your account
              </p>
            </div>

            <div className="space-y-4">
              <Button
                type="button"
                onClick={handleLogin}
                disabled={!password || password.length < 6 || isLoggingIn}
                className="w-full"
                variant={"greenish"}
              >
                {isLoggingIn ? (
                  <>
                    <SheiLoader size="sm" loaderColor="white" className="mr-2" />
                    Logging in...
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Login
                  </div>
                )}
              </Button>

              <Button
                type="button"
                onClick={resetToEmail}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Use different email
              </Button>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800/30">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-green-800 dark:text-green-300">
                <CheckCircle className="h-4 w-4" />
                Account Verified
              </h4>
              <p className="text-xs text-green-700 dark:text-green-400">
                Your email has been verified in our system. Please enter your password to continue.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {step === "loading" && (
        <Card className="shadow-lg border-border">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto">
              <SheiLoader size="lg" loaderColor="primary" />
            </div>
            <CardTitle className="text-xl font-bold">
              {isCheckingEmail ? "Checking Your Account" : "Processing..."}
            </CardTitle>
            <CardDescription>
              Please wait a moment
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pt-6">
            <p className="text-muted-foreground">
              {isCheckingEmail ? "Verifying your email in our system..." : "Completing your request..."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}