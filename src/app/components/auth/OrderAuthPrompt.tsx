// components/auth/OrderAuthPrompt.tsx - FIXED VERSION
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
} from "lucide-react";

interface OrderAuthPromptProps {
  storeSlug: string;
  customerEmail?: string;
  hasAuthUserId?: boolean;
  isLoggedIn?: boolean;
  authEmail?: string | null;
  title?: string;
  description?: string;
}

export function OrderAuthPrompt({
  storeSlug,
  customerEmail,
  hasAuthUserId = false,
  isLoggedIn = false,
  authEmail = null,
  title = "Access Your Orders",
  description = "Sign in or complete your account to view your order history",
}: OrderAuthPromptProps) {
  const router = useRouter();

  // DEBUG LOGS - Enhanced
  console.log('🔍 OrderAuthPrompt Props:', {
    customerEmail,
    hasAuthUserId,
    isLoggedIn,
    authEmail,
    shouldShowCompleteAccount: !isLoggedIn && customerEmail && !hasAuthUserId,
    shouldShowSignIn: !isLoggedIn && customerEmail && hasAuthUserId,
    shouldShowEmailMismatch: isLoggedIn && authEmail && customerEmail && authEmail !== customerEmail,
  });

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

  const handleSignUp = () => {
    if (customerEmail) {
      router.push(
        `/sign-up?redirect=/${storeSlug}/order-status&email=${encodeURIComponent(
          customerEmail
        )}`
      );
    } else {
      router.push(`/sign-up?redirect=/${storeSlug}/order-status`);
    }
  };

  // SCENARIO 1: User is logged in with different email than order email
  if (isLoggedIn && authEmail && customerEmail && authEmail !== customerEmail) {
    console.log('📢 OrderAuthPrompt: Showing email mismatch scenario');
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
  // THIS IS THE ONE THAT SHOULD SHOW FOR GUEST CHECKOUT
  if (!isLoggedIn && customerEmail && !hasAuthUserId) {
    console.log('📢 OrderAuthPrompt: Showing COMPLETE ACCOUNT scenario (guest checkout)');
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
    console.log('📢 OrderAuthPrompt: Showing SIGN IN scenario (has account)');
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-chart-2/10 to-chart-2/20 rounded-full flex items-center justify-center">
              <LogIn className="h-8 w-8 text-chart-2" />
            </div>
            <CardTitle className="text-2xl font-bold">Sign In to View Orders</CardTitle>
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
              Sign In
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Not your email?{" "}
                <Button
                  variant="link"
                  onClick={() => router.push(`/${storeSlug}/login?redirect=/${storeSlug}/order-status`)}
                  className="text-sm p-0"
                >
                  Use another account
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // SCENARIO 4: No customer found (completely new)
  console.log('📢 OrderAuthPrompt: Showing DEFAULT scenario (no customer)');
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-chart-2/10 to-chart-2/20 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-chart-2" />
          </div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription className="text-base text-muted-foreground">{description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3">
            {/* New User Section */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                New Customer?
              </h3>
              <Button 
                onClick={handleSignUp} 
                className="w-full h-12"
                variant="greenish"
              >
                Create Account
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            {/* Existing User Section */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Existing Customer?
              </h3>
              <Button
                onClick={handleLogin}
                variant="outline"
                className="w-full h-12"
              >
                Sign In
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}