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
import { PasswordStrength } from "../../common/PasswordStrength";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Eye, EyeOff, ArrowRight, UserPlus, ShoppingBag, Plus } from "lucide-react";
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
  const [showPasswordField, setShowPasswordField] = useState(false);
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
      password: Boolean(isSubmitting || isUserLoggedIn),
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

  // ✅ Default values with Bangladesh as default country
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

  // ✅ Use different schema based on login status
  const formSchema = isUserLoggedIn ? customerCheckoutSchemaForLoggedIn : customerCheckoutSchema;

  const form = useForm<CustomerCheckoutFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // ✅ Handle form submission
  const handleSubmit = useCallback((values: CustomerCheckoutFormValues) => {
    console.log("Form submitted with values:", {
      ...values,
      password: values.password ? "***" : "not-provided",
      isUserLoggedIn,
    });
    
    // ✅ For logged-in users, set a dummy password that passes validation
    if (isUserLoggedIn) {
      values.password = "logged-in-user-password";
    }
    
    onSubmit(values);
  }, [onSubmit, isUserLoggedIn]);

  // ✅ Handle Create Password button click
  const handleCreatePasswordClick = () => {
    setShowPasswordField(true);
    // Focus on password field when shown
    setTimeout(() => {
      const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
      if (passwordInput) {
        passwordInput.focus();
      }
    }, 100);
  };

  // ✅ Phone number formatting function
  const formatPhoneNumber = (value: string) => {
    // Remove any non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    // If it starts with +88 or 88, remove it
    let cleaned = digitsOnly;
    if (digitsOnly.startsWith('88')) {
      cleaned = digitsOnly.substring(2);
    } else if (digitsOnly.startsWith('+88')) {
      cleaned = digitsOnly.substring(3);
    }
    
    // Limit to 11 digits maximum
    return cleaned.slice(0, 11);
  };

  // ✅ Handle phone number input change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumber(e.target.value);
    form.setValue('phone', formattedValue, { shouldValidate: true });
  };

  // ✅ Auto-population logic
  useEffect(() => {
    if (isLoadingAuth) return;

    // Scenario 1: User is logged in
    if (isUserLoggedIn && currentUser) {
      const userFormData: CustomerCheckoutFormValues = {
        name: `${currentUser.first_name} ${currentUser.last_name || ""}`.trim(),
        email: currentUser.email || "",
        phone: currentUser.phone ? formatPhoneNumber(currentUser.phone) : "",
        password: "logged-in-user-password",
        country: profile?.country || "Bangladesh",
        city: profile?.city || "Dhaka",
        postCode: profile?.postal_code || "",
        shippingAddress: profile?.address_line_1 || "",
      };

      const currentFormValues = form.getValues();
      const hasChanges =
        JSON.stringify(userFormData) !==
        JSON.stringify({
          ...currentFormValues,
          password: "logged-in-user-password",
        });

      if (hasChanges) {
        form.reset(userFormData);
        setFormData(userFormData);
      }
    }
    // Scenario 2: Guest user
    else if (!isUserLoggedIn && !isLoadingAuth) {
      const currentFormValues = form.getValues();
      const hasStoredData = Object.keys(formData).length > 0;

      if (
        hasStoredData &&
        JSON.stringify(currentFormValues) !== JSON.stringify(formData)
      ) {
        // Format phone number if it exists in stored data
        const formattedFormData = {
          ...formData,
          phone: formData.phone ? formatPhoneNumber(formData.phone) : "",
          country: formData.country || "Bangladesh",
        };
        
        form.reset(formattedFormData);
        
        // Show password field if password exists in stored data
        if (formData.password) {
          setShowPasswordField(true);
        }
      } else if (!hasStoredData) {
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

  // ✅ Get watched password value with proper type handling
  const watchedPassword = form.watch("password");

  // ✅ Determine button text based on user status and password
  const getButtonText = () => {
    if (isUserLoggedIn) {
      return "Place Order";
    } else {
      // For guest users, check if they're creating an account with password
      const hasPassword = watchedPassword && watchedPassword.length > 0;
      return hasPassword ? "Create Account & Place Order" : "Place Order";
    }
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

      {/* Email + Phone */}
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
            placeholder="01XXXXXXXXX"
            type="tel"
            disabled={disabledStates.phone}
            onChange={handlePhoneChange}
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

      {/* ✅ Password section - Only for non-logged-in users */}
      {!isUserLoggedIn && (
        <div className="space-y-3">
          {!showPasswordField ? (
            // Create Password Button (when password field is hidden)
            <div className="flex justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={handleCreatePasswordClick}
                disabled={disabledStates.password}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Password (Optional)
              </Button>
            </div>
          ) : (
            // Password Field (when shown)
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Account Password (Optional)</Label>
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
                  placeholder="Enter your password (optional)"
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
              {/* ✅ Use the reusable PasswordStrength component */}
              <PasswordStrength password={watchedPassword} />
              <p className="text-xs text-muted-foreground">
                Creating a password will save your information for faster checkout next time.
                You can skip this if you prefer not to create an account.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Address Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="country">Country</Label>
          <CountryFlag
            value={form.watch("country")}
            onValueChange={(value) => form.setValue("country", value)}
            disabled={disabledStates.addressFields}
            defaultCountry="Bangladesh"
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

      {/* Shipping Address */}
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

      {/* ✅ Submit Button - Always enabled and with dynamic text */}
      <Button
        type="submit"
        className="w-full mt-6 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:from-yellow-500 hover:to-yellow-700 cursor-pointer transition-colors duration-300"
        disabled={isSubmitting} // ✅ Only disable when submitting, not based on form validity
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-2">
            <SheiLoader
              size="sm"
              loaderColor="white"
              loadingText={
                isUserLoggedIn
                  ? "Placing Order..."
                  : watchedPassword && watchedPassword.length > 0
                  ? "Creating Account & Placing Order..."
                  : "Placing Order..."
              }
            />
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            {!isUserLoggedIn && watchedPassword && watchedPassword.length > 0 && (
              <UserPlus className="h-4 w-4" />
            )}
            <ShoppingBag className="h-4 w-4" />
            {getButtonText()}
            <ArrowRight className="h-4 w-4" />
          </div>
        )}
      </Button>
    </form>
  );
};

export default CheckoutForm;