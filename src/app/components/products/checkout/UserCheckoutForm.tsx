/* eslint-disable @typescript-eslint/no-explicit-any */
// app/components/products/checkout/UserCheckoutForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheiLoader } from "../../ui/SheiLoader/loader";
import {
  customerCheckoutSchema,
  customerCheckoutSchemaForLoggedIn,
  CustomerCheckoutFormValues,
} from "@/lib/schema/checkoutSchema";
import { CountryFlag } from "../../common/CountryFlag";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Eye, EyeOff, CheckCircle, ArrowRight, UserPlus, ShoppingBag } from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSupabaseAuth } from "@/lib/hook/userCheckAuth";
import { CheckoutFormSkeleton } from "../../../components/skeletons/CheckoutFormSkeleton";

interface CheckoutFormProps {
  onSubmit: (values: CustomerCheckoutFormValues) => void;
  isLoading?: boolean;
  shippingMethod?: string;
  shippingFee?: number;
  totalAmount?: number;
  mode?: "checkout" | "confirm";
}

const CheckoutForm = ({
  onSubmit,
  isLoading = false,
  shippingMethod = "",
  shippingFee = 0,
  totalAmount = 0,
  mode = "checkout",
}: CheckoutFormProps) => {
  const { formData, setFormData } = useCheckoutStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    user: currentUser,
    loading: userLoading,
    error: userError,
    profile,
  } = useCurrentUser();
  const { session, loading: authLoading } = useSupabaseAuth();

  // ✅ Memoize computed values
  const isLoadingAuth = authLoading || userLoading;
  const isUserLoggedIn = Boolean(currentUser && session);
  const isSubmitting = isLoading;

  // ✅ Create clean boolean disabled states
  const disabledStates = useMemo(
    () => ({
      name: Boolean(isSubmitting || isUserLoggedIn),
      email: Boolean(isSubmitting || isUserLoggedIn),
      phone: Boolean(isSubmitting || (isUserLoggedIn && currentUser?.phone)),
      password: Boolean(isSubmitting || isUserLoggedIn), // ✅ FIX: Disable password for logged-in users
      addressFields: Boolean(isSubmitting),
    }),
    [isSubmitting, isUserLoggedIn, currentUser?.phone]
  );

  // ✅ Handle auth errors gracefully
  useEffect(() => {
    if (userError) {
      const isMissingSessionError =
        userError.message?.includes("Auth session missing") ||
        userError.name === "AuthSessionMissingError";

      if (isMissingSessionError) {
        console.log("🔐 No auth session - user is not logged in (this is normal)");
        return;
      }
      console.error("User hook error:", userError);
    }
  }, [userError]);

  // ✅ FIXED: Create form with proper schema based on login status
  const defaultValues: CustomerCheckoutFormValues = {
    name: formData.name || "",
    email: formData.email || "",
    phone: formData.phone || "",
    password: formData.password || "",
    country: formData.country || "Bangladesh",
    city: formData.city || "Dhaka",
    postCode: formData.postCode || "",
    shippingAddress: formData.shippingAddress || "",
  };

  // ✅ FIXED: Use different schema based on login status
  const formSchema = isUserLoggedIn ? customerCheckoutSchemaForLoggedIn : customerCheckoutSchema;

  const form = useForm<CustomerCheckoutFormValues>({
    resolver: zodResolver(formSchema), // ✅ FIX: Use conditional schema
    defaultValues,
  });

  // ✅ FIXED: Use useCallback for form submission
  const handleSubmit = useCallback((values: CustomerCheckoutFormValues) => {
    console.log("Form submitted with values:", values);
    
    // ✅ FIX: For logged-in users, set a dummy password that passes validation
    if (isUserLoggedIn) {
      values.password = "logged-in-user-password";
    }
    
    onSubmit(values);
  }, [onSubmit, isUserLoggedIn]);

  // ✅ FIXED: Optimized auto-population
  useEffect(() => {
    if (isLoadingAuth) return;

    // Scenario 1: User is logged in - populate with their data AND profile data
    if (isUserLoggedIn && currentUser) {
      console.log("Auto-populating form with user data and profile:", {
        user: currentUser,
        profile,
      });

      // Combine user data with profile data for address fields
      const userFormData: CustomerCheckoutFormValues = {
        name: `${currentUser.first_name} ${currentUser.last_name || ""}`.trim(),
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        password: "logged-in-user-password", // ✅ FIX: Use valid password for validation
        country: profile?.country || "Bangladesh",
        city: profile?.city || "Dhaka",
        postCode: profile?.postal_code || "",
        shippingAddress: profile?.address_line_1 || "",
      };

      // Only reset if there are actual changes
      const currentFormValues = form.getValues();
      const hasChanges =
        JSON.stringify(userFormData) !==
        JSON.stringify({
          ...currentFormValues,
          password: "logged-in-user-password",
        });

      if (hasChanges) {
        console.log("Resetting form with user and profile data");
        form.reset(userFormData);
        setFormData(userFormData);
      }
    }
    // Scenario 2: Guest user - ensure form has stored data with defaults
    else if (!isUserLoggedIn && !isLoadingAuth) {
      const currentFormValues = form.getValues();
      const hasStoredData = Object.keys(formData).length > 0;

      if (
        hasStoredData &&
        JSON.stringify(currentFormValues) !== JSON.stringify(formData)
      ) {
        console.log("Resetting form with stored guest data");
        form.reset(formData);
      } else if (!hasStoredData) {
        // Set default values for new users
        const defaultFormData: CustomerCheckoutFormValues = {
          name: "",
          email: "",
          phone: "",
          password: "",
          country: "Bangladesh",
          city: "Dhaka",
          postCode: "",
          shippingAddress: "",
        };
        form.reset(defaultFormData);
        setFormData(defaultFormData);
      }
    }
  }, [
    currentUser,
    profile,
    isUserLoggedIn,
    isLoadingAuth,
    setFormData,
    formData,
    form,
  ]);

  // ✅ Password strength indicator (only for non-logged-in users)
  const PasswordStrengthIndicator = ({ password }: { password: string }) => {
    if (isUserLoggedIn) return null; // ✅ FIX: Don't show for logged-in users

    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    const strength = Object.values(checks).filter(Boolean).length;
    const strengthText = ["Very Weak", "Weak", "Fair", "Good", "Strong"][
      strength - 1
    ] || "Very Weak";

    return (
      <div className="mt-2 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span>Password strength: {strengthText}</span>
          <span>{strength}/5</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              strength <= 2
                ? "bg-red-500"
                : strength <= 3
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
            style={{ width: `${(strength / 5) * 100}%` }}
          ></div>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle
              className={`h-3 w-3 ${
                checks.length ? "text-green-500" : "text-gray-300"
              }`}
            />
            <span>8+ characters</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle
              className={`h-3 w-3 ${
                checks.uppercase ? "text-green-500" : "text-gray-300"
              }`}
            />
            <span>Uppercase letter</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle
              className={`h-3 w-3 ${
                checks.lowercase ? "text-green-500" : "text-gray-300"
              }`}
            />
            <span>Lowercase letter</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle
              className={`h-3 w-3 ${
                checks.number ? "text-green-500" : "text-gray-300"
              }`}
            />
            <span>Number</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle
              className={`h-3 w-3 ${
                checks.special ? "text-green-500" : "text-gray-300"
              }`}
            />
            <span>Special character</span>
          </div>
        </div>
      </div>
    );
  };

  // ✅ Show loading state
  if (isLoadingAuth) {
    return <CheckoutFormSkeleton />;
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Name (Full Width) */}
      <div className="grid gap-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          {...form.register("name")}
          placeholder="John Doe"
          disabled={disabledStates.name}
          className={isUserLoggedIn ? "bg-muted cursor-not-allowed" : ""}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      {/* Email + Phone (Side by Side on Larger Screens) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            {...form.register("email")}
            placeholder="john.doe@example.com"
            type="email"
            disabled={disabledStates.email}
            className={isUserLoggedIn ? "bg-muted cursor-not-allowed" : ""}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            {...form.register("phone")}
            placeholder="+8801XXXXXXXXX"
            type="tel"
            disabled={disabledStates.phone}
            className={
              isUserLoggedIn && currentUser?.phone
                ? "bg-muted cursor-not-allowed"
                : ""
            }
          />
          {form.formState.errors.phone && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.phone.message}
            </p>
          )}
        </div>
      </div>

      {/* ✅ FIXED: Only show password field for non-logged-in users */}
      {!isUserLoggedIn && (
        <div className="space-y-3">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Account Password</Label>
              <Button
                type="button"
                variant="link"
                className="text-sm text-blue-600 hover:text-blue-800 p-0 h-auto"
                onClick={() => {
                  const currentPath = window.location.pathname;
                  window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
                }}
              >
                Already have an account? Login
              </Button>
            </div>
            <div className="relative">
              <Input
                {...form.register("password")}
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                disabled={disabledStates.password}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={disabledStates.password}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.password.message}
              </p>
            )}
            {/* Password Strength Indicator */}
            {form.watch("password") && (
              <PasswordStrengthIndicator password={form.watch("password")} />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            We&apos;ll automatically create your account or log you in if you
            already have one.
          </p>
        </div>
      )}

      {/* Address Fields - Always editable for shipping preferences */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="country">Country</Label>
          <CountryFlag
            value={form.watch("country")}
            onValueChange={(value) => form.setValue("country", value)}
            disabled={disabledStates.addressFields}
          />
          {form.formState.errors.country && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.country.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="city">City</Label>
          <Input
            {...form.register("city")}
            placeholder="Dhaka"
            disabled={disabledStates.addressFields}
          />
          {form.formState.errors.city && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.city.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="postCode">Postal Code</Label>
          <Input
            {...form.register("postCode")}
            placeholder="1000"
            disabled={disabledStates.addressFields}
          />
          {form.formState.errors.postCode && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.postCode.message}
            </p>
          )}
        </div>
      </div>

      {/* Shipping Address (Full Width) */}
      <div className="grid gap-2">
        <Label htmlFor="shippingAddress">Shipping Address</Label>
        <Input
          {...form.register("shippingAddress")}
          placeholder="123 Main St, Apt 4B"
          disabled={disabledStates.addressFields}
        />
        {form.formState.errors.shippingAddress && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.shippingAddress.message}
          </p>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}


      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full mt-6 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:from-yellow-500 hover:to-yellow-700 cursor-pointer transition-colors duration-300"
        disabled={isSubmitting || !form.formState.isValid} // ✅ FIX: Disable if form is invalid
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-2">
            <SheiLoader
              size="sm"
              loaderColor="white"
              loadingText={
                isUserLoggedIn
                  ? "Completing Order..."
                  : "Creating Account & Placing Order..."
              }
            />
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            {isUserLoggedIn ? (
              <>
                <ShoppingBag className="h-4 w-4" />
                Place Order
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Create Account & Place Order
              </>
            )}
            <ArrowRight className="h-4 w-4" />
          </div>
        )}
      </Button>
    </form>
  );
};

export default CheckoutForm;