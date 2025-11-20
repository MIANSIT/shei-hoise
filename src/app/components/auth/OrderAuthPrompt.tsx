// components/auth/OrderAuthPrompt.tsx
"use client";

import { useRouter } from "next/navigation";
import { useCheckoutStore } from "@/lib/store/userInformationStore"; // ✅ CORRECT IMPORT
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
  ShoppingBag,
  Mail,
  Key,
  AlertCircle,
} from "lucide-react";

interface OrderAuthPromptProps {
  storeSlug: string;
  title?: string;
  description?: string;
  redirectPath?: string;
}

export function OrderAuthPrompt({
  storeSlug,
  title = "View Your Orders",
  description = "Sign in or create an account to view your order status and history",
  redirectPath = "/order-status",
}: OrderAuthPromptProps) {
  const router = useRouter();
  const { formData } = useCheckoutStore();

  const handleLogin = () => {
    if (formData.email) {
      router.push(
        `/login?redirect=/${storeSlug}${redirectPath}&email=${encodeURIComponent(
          formData.email
        )}`
      );
    } else {
      router.push(`/login?redirect=/${storeSlug}${redirectPath}`);
    }
  };

  const handleSignUp = () => {
    if (formData.email) {
      router.push(
        `/sign-up?redirect=/${storeSlug}${redirectPath}&email=${encodeURIComponent(
          formData.email
        )}`
      );
    } else {
      router.push(`/sign-up?redirect=/${storeSlug}${redirectPath}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <ShoppingBag className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {formData.email && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-start gap-2">
                <Key className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-blue-800 text-xs font-medium">
                    Quick Registration
                  </p>
                  <p className="text-blue-700 text-xs mt-1">
                    Your email <strong>{formData.email}</strong> is ready. Just
                    create a password to complete your account.
                  </p>
                </div>
              </div>
            </div>
          )}
          {!formData.email && (
            <p className="text-xs text-muted-foreground text-center">
              Create an account to track orders and save your information
            </p>
          )}
          {/* Action Buttons */}
          <div className="space-y-3">
            {/* New User Section */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                New to our store?
              </h3>
              <Button onClick={handleSignUp} className="w-full h-12">
                Create Account & View Orders
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
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
                Already have an account?
              </h3>
              <Button
                onClick={handleLogin}
                variant="outline"
                className="w-full h-12"
              >
                Sign In to View Orders
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Access your order history and track current orders
              </p>
            </div>
          </div>

          {/* Additional Help */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              💡 <strong>Tip:</strong> After signing in, you&apos;ll be able to
              see all your orders and track their status in real-time.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
