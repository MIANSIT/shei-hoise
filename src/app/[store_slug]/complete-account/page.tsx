/* eslint-disable @typescript-eslint/no-explicit-any */
// app/[store_slug]/complete-account/page.tsx - UPDATED
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, CheckCircle, AlertCircle, Loader2, Shield } from "lucide-react";
import { useCurrentCustomer } from "@/lib/hook/useCurrentCustomer";
import { useParams } from "next/navigation";
import { PasswordStrength } from "../../components/common/PasswordStrength";
import { PasswordToggle } from "../../components/common/PasswordToggle";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import { linkAuthToCustomer } from "@/lib/queries/customers/getCustomerByEmail";

export default function CompleteAccountPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const storeSlug = params.store_slug as string;
  const emailFromUrl = searchParams.get("email") || "";
  const customerIdFromUrl = searchParams.get("customer_id") || "";
  
  const { customer, clearCache } = useCurrentCustomer(storeSlug);
  const { setJustCreatedAccount, setCreatedAccountEmail, clearAccountCreationFlags } = useCheckoutStore();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentCustomerId, setCurrentCustomerId] = useState<string>(customerIdFromUrl);

  // Use customer email if available, otherwise use from URL
  const email = customer?.email || emailFromUrl;

  // Update customer ID from hook if available
  useEffect(() => {
    if (customer?.id && !currentCustomerId) {
      setCurrentCustomerId(customer.id);
    }
  }, [customer?.id, currentCustomerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email) {
      setError("Email is required");
      return;
    }

    if (!currentCustomerId) {
      setError("Customer information is missing. Please try again.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Additional password strength validation
    const checks = {
      length: formData.password.length >= 8,
      uppercase: /[A-Z]/.test(formData.password),
      lowercase: /[a-z]/.test(formData.password),
      number: /[0-9]/.test(formData.password),
    };

    const strength = Object.values(checks).filter(Boolean).length;
    if (strength < 3) {
      setError("Please use a stronger password (at least 8 characters with mix of uppercase, lowercase, and numbers)");
      return;
    }

    setLoading(true);

    try {
      let authUserId: string | null = null;
      let loginSuccess = false;

      // 1. Try to sign up the user with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          data: {
            store_slug: storeSlug,
          }
        },
      });

      if (signUpError) {
        // If user already exists, try signing in
        if (signUpError.message.includes("already registered")) {
          console.log("🔄 User exists, attempting sign-in...");
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: formData.password,
          });

          if (signInError) {
            console.warn("⚠️ Sign-in failed:", signInError.message);
            
            // Check if it's an invalid credentials error
            if (signInError.message.includes("Invalid login credentials")) {
              setError("Incorrect password. Please try again or use 'Sign In Instead'.");
              setLoading(false);
              return;
            }
            
            throw signInError;
          }

          if (signInData.user) {
            authUserId = signInData.user.id;
            loginSuccess = true;
            console.log("✅ Auto-login successful for existing user");
          }
        } else {
          throw signUpError;
        }
      } else if (authData?.user) {
        authUserId = authData.user.id;
        
        // Try to auto-login after sign-up
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: formData.password,
          });
          
          if (signInError) {
            console.warn("⚠️ Auto-login after sign-up failed:", signInError.message);
            // User may need email confirmation
            loginSuccess = false;
          } else {
            loginSuccess = true;
            console.log("✅ Auto-login after sign-up successful");
          }
        } catch (loginError) {
          console.error("❌ Auto-login error:", loginError);
          loginSuccess = false;
        }
      }

      // 2. CRITICAL FIX: Link auth_user_id to the EXISTING customer record
      if (currentCustomerId && authUserId) {
        console.log("🔗 Linking auth user to existing customer:", {
          customerId: currentCustomerId,
          authUserId: authUserId
        });
        
        const linked = await linkAuthToCustomer(currentCustomerId, authUserId);
        
        if (!linked) {
          console.warn("⚠️ Failed to link auth user ID to customer. Will try direct update.");
          
          // Try direct update as fallback
          const { error: updateError } = await supabase
            .from("store_customers")
            .update({ 
              auth_user_id: authUserId,
              updated_at: new Date().toISOString()
            })
            .eq("id", currentCustomerId);

          if (updateError) {
            console.error("❌ Direct update also failed:", updateError);
            // Continue anyway - the user can still log in
          } else {
            console.log("✅ Direct update successful");
          }
        }
      } else if (customer?.id && authUserId) {
        // Fallback to customer from hook
        console.log("🔗 Linking auth user to customer from hook:", customer.id);
        await linkAuthToCustomer(customer.id, authUserId);
      }

      // Clear customer cache
      clearCache?.();
      
      // ✅ Set Zustand flags for immediate order access
      if (authUserId) {
        setJustCreatedAccount(true);
        setCreatedAccountEmail(email);
        console.log("✅ Account created/setup complete, setting Zustand flags");
      }
      
      setSuccess(true);

      // Show appropriate success message
      if (loginSuccess) {
        console.log("✅ Account setup complete! User is logged in.");
        // Redirect to orders page after 1 second
        setTimeout(() => {
          router.push(`/${storeSlug}/order-status`);
        }, 1000);
      } else {
        console.log("✅ Account setup complete! User may need email verification.");
        // Wait a bit longer for email verification users
        setTimeout(() => {
          router.push(`/${storeSlug}/order-status`);
        }, 2000);
      }

    } catch (err: any) {
      console.error("Error completing account:", err);
      setError(err.message || "Failed to complete account setup");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginInstead = () => {
    router.push(`/${storeSlug}/login?redirect=/${storeSlug}/order-status&email=${encodeURIComponent(email)}`);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, password: e.target.value });
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, confirmPassword: e.target.value });
  };

  if (!email || !currentCustomerId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Information Required</CardTitle>
            <CardDescription>
              Please provide your email and customer information to complete account setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push(`/${storeSlug}/order-status`)}
              className="w-full"
              variant="greenish"
            >
              Back to Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-chart-2/10 to-chart-2/20 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-chart-2" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Complete Your Account
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Set a password for <strong className="text-foreground">{email}</strong> to access your orders
          </CardDescription>
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            Customer ID: {currentCustomerId.slice(0, 8)}...
          </div>
        </CardHeader>

        <CardContent>
          {success ? (
            <Alert className="bg-gradient-to-r from-chart-2/10 to-chart-2/20 border-chart-2/30 animate-in fade-in duration-500">
              <CheckCircle className="h-5 w-5 text-chart-2" />
              <AlertDescription className="text-foreground ml-2">
                Account setup complete! Redirecting to your orders...
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="animate-in slide-in-from-top duration-300">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted/50 border-input pr-10 font-medium"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <CheckCircle className="h-5 w-5 text-chart-2" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This email is already registered with your order(s)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handlePasswordChange}
                    placeholder="Create a strong password"
                    required
                    minLength={6}
                    className="pr-12 border-input"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <PasswordToggle
                      show={showPassword}
                      onToggle={() => setShowPassword(!showPassword)}
                      size={18}
                      className="hover:bg-accent/20"
                    />
                  </div>
                </div>
                <PasswordStrength password={formData.password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    placeholder="Re-enter your password"
                    required
                    className="pr-12 border-input"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <PasswordToggle
                      show={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                      size={18}
                      className="hover:bg-accent/20"
                    />
                  </div>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-destructive animate-in fade-in">
                    Passwords do not match
                  </p>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <p className="text-xs text-chart-2 flex items-center gap-1 animate-in fade-in">
                    <CheckCircle className="h-3 w-3" />
                    Passwords match
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-12"
                  variant="greenish"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Setting up account...
                    </>
                  ) : (
                    "Complete Account Setup"
                  )}
                </Button>
                
                <div className="p-4 bg-chart-2/5 rounded-lg border border-chart-2/20 dark:border-chart-2/30">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-foreground">
                    <CheckCircle className="h-4 w-4 text-chart-2" />
                    What you&apos;ll get:
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-chart-2"></div>
                      Access to all your orders from this store
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-chart-2"></div>
                      Order tracking and status updates
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-chart-2"></div>
                      Faster checkout on future purchases
                    </li>
                  </ul>
                </div>
              </div>
            </form>
          )}
        </CardContent>

        {!success && (
          <CardFooter className="flex justify-center border-t border-border pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Already have an account with this email?
              </p>
              <Button
                variant="outline"
                onClick={handleLoginInstead}
                className="text-sm"
              >
                Sign In Instead
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}