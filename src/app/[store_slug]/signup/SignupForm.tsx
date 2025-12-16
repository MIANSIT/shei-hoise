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
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SignupForm() {
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check if passwords match
  const passwordsMatch = password === confirmPassword && password.length > 0;

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
      refreshCustomerData(storeSlug);

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
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <SheiLoader size="lg" loaderColor="primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="shadow-lg border-border">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-chart-2/10 to-chart-2/20 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-chart-2" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Create Account
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Sign up to get started with your shopping
          </CardDescription>
        </CardHeader>

        {email && (
          <div className="px-6">
            <Alert className="bg-gradient-to-r from-chart-2/10 to-chart-2/20 border-chart-2/30">
              <Mail className="h-5 w-5 text-chart-2" />
              <AlertDescription className="text-foreground ml-2">
                Email <strong>{email}</strong> has been pre-filled
              </AlertDescription>
            </Alert>
          </div>
        )}

        <CardContent className="space-y-6 pt-6">
          {/* Email Field */}
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
                className="h-12 text-base pr-10"
                disabled={isSubmitting}
                autoFocus
              />
              {email && email.includes("@") && (
                <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              We&apos;ll use this for your account
            </p>
          </div>

          {/* Password Field */}
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
                disabled={isSubmitting}
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
            <PasswordStrength password={password} />
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
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
                className="h-12 text-base pr-12"
                disabled={isSubmitting}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <PasswordToggle
                  show={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  size={20}
                  className="hover:bg-accent/20"
                />
              </div>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-sm text-red-500">Passwords do not match</p>
            )}
            {confirmPassword.length > 0 && passwordsMatch && (
              <p className="text-sm text-green-600 flex items-center gap-1">
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
            className="w-full h-12 bg-green-500 hover:bg-green-600 text-white mt-2"
          >
            {isSubmitting ? (
              <>
                <SheiLoader size="sm" loaderColor="white" className="mr-2" />
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5 mr-2" />
                Create Account
              </>
            )}
          </Button>

          {/* Benefits Card */}
          <div className="p-4 bg-chart-2/5 rounded-lg border border-chart-2/20">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-foreground">
              <Check className="h-4 w-4 text-chart-2" />
              What you&apos;ll get:
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-chart-2"></div>
                Access to all your orders and tracking
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-chart-2"></div>
                Faster checkout on future purchases
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-chart-2"></div>
                Order history and easy reordering
              </li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-6 border-t">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Already have an account?
            </p>
            <Button
              type="button"
              onClick={() => {
                router.push(`/${storeSlug}/login${email ? `?email=${encodeURIComponent(email)}` : ""}`);
              }}
              variant="outline"
              className="w-full h-11"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Sign in instead
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Creating account for <span className="font-semibold text-primary">{storeSlug}</span>
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}