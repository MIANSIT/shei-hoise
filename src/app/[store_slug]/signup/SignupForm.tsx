/* eslint-disable @typescript-eslint/no-explicit-any */
// app/[store_slug]/signup/SignupForm.tsx
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
import { ArrowLeft, Lock, Mail, Check, UserPlus, Shield } from "lucide-react";
import { refreshCustomerData } from "@/lib/hook/useCurrentCustomer";
import { PasswordToggle } from "../../components/common/PasswordToggle";
import { PasswordStrength } from "../../components/common/PasswordStrength";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const storeSlug = params.store_slug as string;
  const redirectParam = searchParams.get("redirect");
  
  const getRedirectUrl = () => {
    if (redirectParam) return redirectParam;
    return `/${storeSlug}`;
  };
  
  const redirectTo = getRedirectUrl();
  const { success, error } = useSheiNotification();
  const { formData } = useCheckoutStore();
  
  const [isStoreLoaded, setIsStoreLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check if passwords match
  const passwordsMatch = password === confirmPassword && password.length > 0;

  // Initialize
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStoreLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Store current page
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("preSignupPage", window.location.pathname);
    }
  }, []);

  // Check if email exists
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const { data: customer, error } = await supabase
        .from("store_customers")
        .select("email")
        .eq("email", email.toLowerCase())
        .limit(1);
      if (error) throw error;
      return !!customer && customer.length > 0;
    } catch (err) {
      console.error("Error checking email:", err);
      return false;
    }
  };

  // Handle signup
  const handleSignup = async () => {
    if (!email || !email.includes("@")) {
      error("Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      error("Password must be at least 6 characters long");
      return;
    }

    if (!passwordsMatch) {
      error("Passwords do not match");
      return;
    }

    // Calculate password strength
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    const strength = Object.values(checks).filter(Boolean).length;
    if (strength < 2) {
      error("Please choose a stronger password");
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if email exists
      const emailExists = await checkEmailExists(email);
      if (emailExists) {
        error("This email is already registered. Please login instead.");
        setIsSubmitting(false);
        return;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password: password,
        options: { data: { email: email.toLowerCase(), role: "customer" } },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          error("This email is already registered. Please login instead.");
        } else {
          error(authError.message || "Signup failed. Please try again.");
        }
        return;
      }

      // Auto-login
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password,
      });

      if (loginError) {
        console.error("Auto-login failed:", loginError);
      }

      // Create customer record
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("id")
        .eq("store_slug", storeSlug)
        .single();

      if (storeError) {
        console.error("Store not found:", storeError);
        throw new Error("Store not found");
      }

      const { data: customer, error: customerError } = await supabase
        .from("store_customers")
        .insert({
          email: email.toLowerCase(),
          auth_user_id: authData.user?.id || loginData?.user?.id,
          name: email.split("@")[0],
        })
        .select("id")
        .single();

      if (customerError) {
        console.error("Failed to create customer:", customerError);
      }

      // Create store_customer_link
      if (customer && store) {
        await supabase
          .from("store_customer_links")
          .insert({ customer_id: customer.id, store_id: store.id });
      }

      success("Account created successfully! Welcome!", { duration: 2000 });
      refreshCustomerData();

      const { clearAccountCreationFlags } = useCheckoutStore.getState();
      clearAccountCreationFlags();

      // Redirect
      setTimeout(() => {
        let finalRedirectUrl = redirectTo;
        if (typeof window !== "undefined") {
          const preSignupPage = sessionStorage.getItem("preSignupPage");
          if (preSignupPage && !preSignupPage.includes("/signup")) {
            finalRedirectUrl = preSignupPage;
          }
        }
        router.push(finalRedirectUrl);
      }, 1500);

    } catch (err: any) {
      console.error("Signup error:", err);
      error(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSignup();
    }
  };

  if (!isStoreLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <SheiLoader size="lg" loaderColor="primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen w-full py-4">
      <Card className="w-full max-w-xl shadow-xl border-border/40">
        <CardHeader className="text-center space-y-4 px-8 pt-10">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-chart-2/10 to-chart-2/20 rounded-full flex items-center justify-center">
            <Shield className="h-10 w-10 text-chart-2" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Create Account
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Sign up to get started with your shopping
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 px-8 pt-2">
          {/* Email Field */}
          <div className="space-y-3">
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
                disabled={isSubmitting}
                autoFocus
              />
              {email && email.includes("@") && (
                <Check className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              We&apos;ll use this for your account
            </p>
          </div>

          {/* Password Field */}
          <div className="space-y-3">
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
                className="text-base pr-14"
                disabled={isSubmitting}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <PasswordToggle
                  show={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  size={22}
                  className="hover:bg-accent/20"
                />
              </div>
            </div>
            <PasswordStrength password={password} />
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-3">
            <Label htmlFor="confirmPassword" className="text-base font-semibold">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="••••••••"
                className="text-base pr-14"
                disabled={isSubmitting}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <PasswordToggle
                  show={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  size={22}
                  className="hover:bg-accent/20"
                />
              </div>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-sm text-red-500 flex items-center gap-2 mt-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                Passwords do not match
              </p>
            )}
            {confirmPassword.length > 0 && passwordsMatch && (
              <p className="text-sm text-green-600 flex items-center gap-2 mt-2">
                <Check className="h-4 w-4" />
                Passwords match
              </p>
            )}
          </div>

          {/* Sign Up Button */}
          <Button
            type="button"
            onClick={handleSignup}
            disabled={
              !email ||
              !email.includes("@") ||
              !password ||
              !confirmPassword ||
              !passwordsMatch ||
              password.length < 6 ||
              isSubmitting
            }
            className="w-full mt-6"
            variant={"greenish"}
          >
            {isSubmitting ? (
              <>
                <SheiLoader size="sm" loaderColor="white" className="mr-3" />
                <span className="text-base font-medium">Creating Account...</span>
              </>
            ) : (
              <>
                <UserPlus className="h-6 w-6 mr-3" />
                <span className="text-base font-medium">Create Account</span>
              </>
            )}
          </Button>

          {/* Benefits Card */}
          <div className="p-5 bg-gradient-to-r from-chart-2/5 to-chart-2/10 rounded-xl border border-chart-2/20 mt-4">
            <h4 className="font-semibold text-base mb-3 flex items-center gap-3 text-foreground">
              <Check className="h-5 w-5 text-chart-2" />
              What you&apos;ll get:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2.5">
              <li className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-chart-2 mt-2 flex-shrink-0"></div>
                <span>Access to all your orders and tracking</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-chart-2 mt-2 flex-shrink-0"></div>
                <span>Faster checkout on future purchases</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-chart-2 mt-2 flex-shrink-0"></div>
                <span>Order history and easy reordering</span>
              </li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-5 pt-8 pb-10 px-8 border-t border-border/40">
          <div className="text-center">
            <p className="text-base text-muted-foreground mb-4">
              Already have an account?
            </p>
            <Button
              type="button"
              onClick={() => {
                router.push(`/${storeSlug}/login`);
              }}
              variant="outline"
              className="w-full text-base"
            >
              Login Instead
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}