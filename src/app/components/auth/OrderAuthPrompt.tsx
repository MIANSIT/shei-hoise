// components/auth/OrderAuthPrompt.tsx - UPDATED VERSION WITH PHONE SUPPORT
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LogIn,
  UserPlus,
  Key,
  AlertCircle,
  Shield,
  Phone,
  UserCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface OrderAuthPromptProps {
  storeSlug: string;
  customerEmail?: string;
  customerPhone?: string;
  hasAuthUserId?: boolean;
  isLoggedIn?: boolean;
  authEmail?: string | null;
  title?: string;
  description?: string;
}

export function OrderAuthPrompt({
  storeSlug,
  customerEmail,
  customerPhone = "",
  hasAuthUserId = false,
  isLoggedIn = false,
  authEmail = null,
  title = "Access Your Orders",
  description = "Enter your phone number to access your order history",
}: OrderAuthPromptProps) {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState(customerPhone || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    let cleaned = digitsOnly;
    if (digitsOnly.startsWith("88")) {
      cleaned = digitsOnly.substring(2);
    } else if (digitsOnly.startsWith("+88")) {
      cleaned = digitsOnly.substring(3);
    }
    return cleaned.slice(0, 11);
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumber(e.target.value);
    setPhoneNumber(formattedValue);
  };

  const handleLoginWithPhone = () => {
    setIsSubmitting(true);
    if (phoneNumber && phoneNumber.length === 11) {
      router.push(
        `/${storeSlug}/login?redirect=/${storeSlug}/order-status&phone=${encodeURIComponent(phoneNumber)}`
      );
    } else {
      // Handle invalid phone number
      setIsSubmitting(false);
    }
  };

  const handleLogin = () => {
    if (customerEmail) {
      router.push(
        `/${storeSlug}/login?redirect=/${storeSlug}/order-status&email=${encodeURIComponent(
          customerEmail
        )}`
      );
    } else {
      router.push(`/${storeSlug}/login?redirect=/${storeSlug}/order-status`);
    }
  };

  const handleCompleteAccount = () => {
    router.push(
      `/${storeSlug}/complete-account?email=${encodeURIComponent(customerEmail || '')}`
    );
  };

  // SCENARIO 1: User is logged in with different email than order email
  if (isLoggedIn && authEmail && customerEmail && authEmail !== customerEmail) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-chart-2/10 to-chart-2/20 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-chart-2" />
            </div>
            <CardTitle className="text-2xl font-bold">Account Mismatch</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              You&apos;re logged in as <strong className="text-foreground">{authEmail}</strong><br />
              but your order is under <strong className="text-foreground">{customerEmail}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-foreground text-sm font-medium">
                    Different Email Address
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    To view orders for <strong>{customerEmail}</strong>, please log out and sign in with that email.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => router.push(`/${storeSlug}/login?redirect=/${storeSlug}/order-status&email=${encodeURIComponent(customerEmail)}`)}
                className="w-full h-12"
                variant="greenish"
              >
                Sign In with {customerEmail}
              </Button>
              
              <Button
                onClick={() => router.push(`/${storeSlug}/order-status`)}
                variant="outline"
                className="w-full h-12"
              >
                View Orders for {authEmail}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // SCENARIO 2: User is NOT logged in, customer exists WITHOUT auth_user_id (guest checkout)
  if (!isLoggedIn && customerEmail && !hasAuthUserId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-chart-2/10 to-chart-2/20 rounded-full flex items-center justify-center">
              <Key className="h-8 w-8 text-chart-2" />
            </div>
            <CardTitle className="text-2xl font-bold">Complete Your Account</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              You&apos;ve ordered as <strong className="text-foreground">{customerEmail}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="p-3 bg-chart-2/5 border border-chart-2/20 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-chart-2 mt-0.5" />
                <div>
                  <p className="text-foreground text-sm font-medium">
                    Quick Account Setup
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Your email is already registered. Just create a password to complete your account and view all your orders.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleCompleteAccount} 
              className="w-full h-12"
              variant="greenish"
            >
              Set Password & View Orders
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account with this email?
              </p>
              <Button
                variant="link"
                onClick={handleLogin}
                className="text-sm"
              >
                Sign In Instead
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // SCENARIO 3: User is NOT logged in, customer exists WITH auth_user_id
  if (!isLoggedIn && customerEmail && hasAuthUserId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-chart-2/10 to-chart-2/20 rounded-full flex items-center justify-center">
              <LogIn className="h-8 w-8 text-chart-2" />
            </div>
            <CardTitle className="text-2xl font-bold">Sign In Required</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              An account already exists for <strong className="text-foreground">{customerEmail}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-500 mt-0.5" />
                <div>
                  <p className="text-foreground text-sm font-medium">
                    Account Already Exists
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    This email is already associated with an account. Please sign in to access your order history.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleLogin} 
              className="w-full h-12"
              variant="greenish"
            >
              Sign In with Email
            </Button>

            {customerPhone && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Or sign in with phone number:
                </p>
                <Button
                  onClick={() => router.push(`/${storeSlug}/login?redirect=/${storeSlug}/order-status&phone=${encodeURIComponent(customerPhone)}`)}
                  variant="outline"
                  className="w-full h-12"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Sign In with {customerPhone}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // SCENARIO 4: No customer found (completely new) - THIS IS THE MAIN SCENARIO FOR PHONE
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-chart-2/10 to-chart-2/20 rounded-full flex items-center justify-center">
            <UserCheck className="h-8 w-8 text-chart-2" />
          </div>
          <CardTitle className="text-2xl font-bold">Verify Your Identity</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Enter your phone number to access your order history
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                placeholder="01XXXXXXXXX"
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneInputChange}
                disabled={isSubmitting}
                className="h-12 text-center text-lg"
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the phone number used during checkout
              </p>
            </div>

            <Button 
              onClick={handleLoginWithPhone}
              className="w-full h-12"
              variant="greenish"
              disabled={isSubmitting || phoneNumber.length !== 11}
            >
              {isSubmitting ? (
                "Verifying..."
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  {customerPhone ? "Sign In with existing phone number" : "Access My Orders"}
                </>
              )}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have orders with this phone number?{" "}
              <Button
                variant="link"
                onClick={() => router.push(`/${storeSlug}`)}
                className="text-sm p-0"
              >
                Start Shopping
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}