/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheiLoader } from "../../ui/SheiLoader/loader";
import {
  customerCheckoutSchema,
  CustomerCheckoutFormValues,
} from "@/lib/schema/checkoutSchema";
import { CountryFlag } from "../../common/CountryFlag";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import { useEffect, useState, useMemo } from "react";
import { Eye, EyeOff, CheckCircle, ArrowRight } from "lucide-react";
import { createCheckoutCustomer } from "@/lib/queries/customers/createCheckoutCustomer";
import { getCustomerByEmail } from "@/lib/queries/customers/getCustomerByEmail";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSupabaseAuth } from "@/lib/hook/userCheckAuth";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useOrderProcess } from "@/lib/hook/useOrderProcess";
import useCartStore from "@/lib/store/cartStore";
import { CheckoutFormSkeleton } from "../../../components/skeletons/CheckoutFormSkeleton";
import { OrderCompleteSkeleton } from "../../../components/skeletons/OrderCompleteSkeleton";

interface CheckoutFormProps {
  onSubmit: (values: CustomerCheckoutFormValues) => void;
  isLoading?: boolean;
  shippingMethod?: string;
  shippingFee?: number;
  totalAmount?: number;
}

const CheckoutForm = ({
  onSubmit,
  isLoading = false,
  shippingMethod = "",
  shippingFee = 0,
  totalAmount = 0,
}: CheckoutFormProps) => {
  const { formData, setFormData } = useCheckoutStore();
  const { clearStoreCart } = useCartStore();

  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isOrderComplete, setIsOrderComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    user: currentUser,
    loading: userLoading,
    error: userError,
    profile,
  } = useCurrentUser();
  const { session, loading: authLoading } = useSupabaseAuth();

  const params = useParams();
  const router = useRouter();
  const store_slug = params.store_slug as string;

  // Order process hook
  const {
    processOrder,
    loading: orderLoading,
    error: orderError,
  } = useOrderProcess(store_slug);

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

  const form = useForm<CustomerCheckoutFormValues>({
    resolver: zodResolver(customerCheckoutSchema),
    defaultValues,
  });

  // ✅ Memoize computed values to prevent unnecessary re-renders
  const isLoadingAuth = authLoading || userLoading;
  const isUserLoggedIn = Boolean(currentUser && session);
  const isSubmitting = isLoading || isCreatingAccount || orderLoading;

  // ✅ Create clean boolean disabled states
  const disabledStates = useMemo(
    () => ({
      name: Boolean(isSubmitting || isUserLoggedIn),
      email: Boolean(isSubmitting || isUserLoggedIn),
      phone: Boolean(isSubmitting || (isUserLoggedIn && currentUser?.phone)),
      password: Boolean(isSubmitting),
      addressFields: Boolean(isSubmitting),
    }),
    [isSubmitting, isUserLoggedIn, currentUser?.phone]
  );

  // ✅ Handle auth errors gracefully - missing session is normal!
  useEffect(() => {
    if (userError) {
      const isMissingSessionError =
        userError.message?.includes("Auth session missing") ||
        userError.name === "AuthSessionMissingError";

      if (isMissingSessionError) {
        console.log(
          "🔐 No auth session - user is not logged in (this is normal)"
        );
        return;
      }

      console.error("User hook error:", userError);
    }
  }, [userError]);

  // ✅ FIXED: Optimized auto-population with proper typing
  useEffect(() => {
    // Only run if we're done loading and have changes to apply
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
        password: "********", // Placeholder for validation
        country: profile?.country || "Bangladesh",
        city: profile?.city || "Dhaka",
        postCode: profile?.postal_code || "",
        shippingAddress: profile?.address_line_1 || "",
      };

      // Only reset if there are actual changes to prevent loops
      const currentFormValues = form.getValues();
      const hasChanges =
        JSON.stringify(userFormData) !==
        JSON.stringify({
          ...currentFormValues,
          password: "********", // Normalize password comparison
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
    form,
    setFormData,
    formData,
  ]);

  // ✅ FIXED: Properly typed submit handler
  const handleSubmit = async (values: CustomerCheckoutFormValues) => {
    setIsCreatingAccount(true);
    setError(null);
    setSuccess(null);
    setIsOrderComplete(false);

    try {
      // Save form data to store
      setFormData(values);

      let customerId: string | undefined;

      // Scenario 1: User is already logged in
      if (isUserLoggedIn && currentUser) {
        customerId = currentUser.id;
        console.log("Using logged-in user account for order with shipping:", {
          shippingMethod,
          shippingFee,
          totalAmount,
        });

        // Process order with shipping fee
        const result = await processOrder(
          values,
          customerId,
          "cod",
          shippingMethod, // Pass shipping method as delivery option
          shippingFee // Pass shipping fee
        );

        if (result.success) {
          setSuccess(result.message || "Order placed successfully!");
          setIsOrderComplete(true);
          clearStoreCart(store_slug);
          onSubmit(values);
          setTimeout(() => {
            router.push(`/${store_slug}/order-status`);
          }, 2000);
        } else {
          setError(result.error || "Failed to place order");
        }
        return;
      }

      // Scenario 2: Try to auto-login first (if user might have account)
      try {
        console.log("Attempting auto-login with shipping:", {
          shippingMethod,
          shippingFee,
        });
        const { data, error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (!error && data.user) {
          console.log("Auto-login successful");
          customerId = data.user.id;
          const result = await processOrder(
            values,
            customerId,
            "cod",
            shippingMethod, // Pass shipping method as delivery option
            shippingFee // Pass shipping fee
          );

          if (result.success) {
            setSuccess(result.message || "Order placed successfully!");
            setIsOrderComplete(true);
            clearStoreCart(store_slug);
            onSubmit(values);
            setTimeout(() => {
              router.push(`/${store_slug}/order-status`);
            }, 2000);
          } else {
            setError(result.error || "Failed to place order");
          }
          return;
        }

        // If login fails, check if account exists
        const existingCustomer = await getCustomerByEmail(values.email);

        if (existingCustomer) {
          setError("The password you entered is incorrect. Please try again.");
          return;
        }

        // Scenario 3: No account exists - create new one
        console.log("Creating new customer account with shipping:", {
          shippingMethod,
          shippingFee,
        });
        const customerData = {
          ...values,
          store_slug,
        };

        const result = await createCheckoutCustomer(customerData);
        console.log("Customer created successfully:", result);

        // Auto-login the new customer
        const { error: signInError, data: signInData } =
          await supabase.auth.signInWithPassword({
            email: values.email,
            password: values.password,
          });

        if (signInError) {
          console.error("Auto-login error:", signInError);
          throw new Error(
            `Account created but login failed: ${signInError.message}`
          );
        }

        console.log("New customer auto-logged in");
        customerId = signInData.user.id;
        const orderResult = await processOrder(
          values,
          customerId,
          "cod",
          shippingMethod, // Pass shipping method as delivery option
          shippingFee // Pass shipping fee
        );

        if (orderResult.success) {
          setSuccess(orderResult.message || "Order placed successfully!");
          setIsOrderComplete(true);
          clearStoreCart(store_slug);
          onSubmit(values);
          setTimeout(() => {
            router.push(`/${store_slug}/order-status`);
          }, 2000);
        } else {
          setError(orderResult.error || "Failed to place order");
        }
      } catch (processError: any) {
        console.error("Process error:", processError);
        setError(
          processError.message ||
            "Failed to process checkout. Please try again."
        );
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      setError(
        error.message || "Failed to process checkout. Please try again."
      );
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLoginRedirect = () => {
    const currentPath = window.location.pathname;
    router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
  };

  // ✅ Password strength indicator
  const PasswordStrengthIndicator = ({ password }: { password: string }) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    const strength = Object.values(checks).filter(Boolean).length;
    const strengthText =
      ["Very Weak", "Weak", "Fair", "Good", "Strong"][strength - 1] ||
      "Very Weak";

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

  // ✅ REPLACED: Using custom skeleton for auth loading
  if (isLoadingAuth) {
    return <CheckoutFormSkeleton />;
  }

  // ✅ REPLACED: Using custom skeleton for order completion
  if (isOrderComplete) {
    return <OrderCompleteSkeleton />;
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

      {/* ✅ Ultra-Simple Password Flow - Show for ALL unauthenticated users */}
      {!isUserLoggedIn && (
        <div className="space-y-3">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Account Password</Label>
              <Button
                type="button"
                variant="link"
                className="text-sm text-blue-600 hover:text-blue-800 p-0 h-auto"
                onClick={handleLoginRedirect}
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
                onClick={togglePasswordVisibility}
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

      {/* Order Error Message */}
      {orderError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{orderError}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full mt-6 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:from-yellow-500 hover:to-yellow-700 cursor-pointer transition-colors duration-300"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-2">
            <SheiLoader
              size="sm"
              loaderColor="white"
              loadingText={
                isUserLoggedIn
                  ? "Completing Order..."
                  : isCreatingAccount
                  ? "Creating Account..."
                  : "Processing..."
              }
            />
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            {isUserLoggedIn ? "Place Order" : "Place Order"}
            <ArrowRight className="h-4 w-4" />
          </div>
        )}
      </Button>

      {isCreatingAccount && !isUserLoggedIn && (
        <p className="text-sm text-center text-muted-foreground">
          Creating your account and logging you in...
        </p>
      )}
    </form>
  );
};

export default CheckoutForm;
