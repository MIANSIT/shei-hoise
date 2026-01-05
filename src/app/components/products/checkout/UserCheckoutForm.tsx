/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/components/products/checkout/UserCheckoutForm.tsx - FIXED VERSION
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
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Eye,
  EyeOff,
  ArrowRight,
  UserPlus,
  ShoppingBag,
  Plus,
} from "lucide-react";
import { useSupabaseAuth } from "@/lib/hook/userCheckAuth";
import { CheckoutFormSkeleton } from "../../../components/skeletons/CheckoutFormSkeleton";
import { useParams } from "next/navigation";

interface CheckoutFormProps {
  onSubmit: (values: CustomerCheckoutFormValues) => void;
  isLoading?: boolean;
  shippingMethod?: string;
  shippingFee?: number;
  totalAmount?: number;
  taxAmount?: number;
  mode?: "checkout" | "confirm";
}

const CheckoutForm = ({
  onSubmit,
  isLoading = false,
  shippingMethod = "",
  shippingFee = 0,
  totalAmount = 0,
  taxAmount = 0,
  mode = "checkout",
}: CheckoutFormProps) => {
  const params = useParams();
  const storeSlug = params.store_slug as string;

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  
  const { session, loading: authLoading } = useSupabaseAuth();
  const { formData, setFormData, setStoreSlug } = useCheckoutStore();
  
  const isUserLoggedIn = useMemo(() => Boolean(session), [session]);
  const isSubmitting = isLoading;
  
  // ✅ CRITICAL FIX: Use ref to track initialization
  const isInitializedRef = useRef(false);
  
  // ✅ Memoized user data
  const loggedInUserEmail = useMemo(() => session?.user?.email || null, [session]);
  const loggedInUserName = useMemo(() => {
    if (!session?.user?.user_metadata) return null;
    const meta = session.user.user_metadata;
    return meta.first_name 
      ? `${meta.first_name} ${meta.last_name || ''}`.trim()
      : meta.full_name || null;
  }, [session]);
  
  const loggedInUserPhone = useMemo(() => 
    session?.user?.user_metadata?.phone || null, 
  [session]);

  // ✅ Memoized default values - ONLY include static initial values
  const defaultValues = useMemo(() => {
    // For logged-in users, use session data
    if (isUserLoggedIn) {
      return {
        name: loggedInUserName || "",
        email: loggedInUserEmail || "",
        phone: loggedInUserPhone || "",
        password: "",
        country: "Bangladesh",
        city: "Dhaka",
        postCode: "",
        shippingAddress: "",
      };
    }
    
    // For guest users, use formData but don't include password in defaults
    return {
      name: formData.name || "",
      email: formData.email || "",
      phone: formData.phone || "",
      password: "", // ALWAYS empty for guest users on initialization
      country: formData.country || "Bangladesh",
      city: formData.city || "Dhaka",
      postCode: formData.postCode || "",
      shippingAddress: formData.shippingAddress || "",
    };
  }, [isUserLoggedIn, loggedInUserName, loggedInUserEmail, loggedInUserPhone, formData]);

  // ✅ Schema selection
  const formSchema = useMemo(() => 
    isUserLoggedIn ? customerCheckoutSchemaForLoggedIn : customerCheckoutSchema,
    [isUserLoggedIn]
  );

  const form = useForm<CustomerCheckoutFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Optimized save function - DON'T save password to Zustand
  const saveFormData = useCallback((values: Partial<CustomerCheckoutFormValues>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      // ✅ CRITICAL: Don't save password to Zustand store
      setFormData({
        name: values.name || "",
        email: values.email || "",
        phone: values.phone || "",
        country: values.country || "Bangladesh",
        city: values.city || "Dhaka",
        shippingAddress: values.shippingAddress || "",
        postCode: values.postCode || "",
      });
    }, 3000);
  }, [setFormData]);

  // ✅ Handle form submission
  const handleSubmit = useCallback(
    (values: CustomerCheckoutFormValues) => {
      

      // For logged-in users, ensure password is empty
      const submitValues = isUserLoggedIn 
        ? { ...values, password: "" }
        : { ...values, password: values.password || "" };

      // Save to Zustand (without password)
      setFormData({
        name: values.name,
        email: values.email,
        phone: values.phone,
        country: values.country,
        city: values.city,
        shippingAddress: values.shippingAddress,
        postCode: values.postCode,
      });

      setStoreSlug(storeSlug);
      onSubmit(submitValues);
    },
    [onSubmit, isUserLoggedIn, setFormData, setStoreSlug, storeSlug]
  );

  // ✅ Phone formatting
  const formatPhoneNumber = useCallback((value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    let cleaned = digitsOnly;
    if (digitsOnly.startsWith("88")) {
      cleaned = digitsOnly.substring(2);
    } else if (digitsOnly.startsWith("+88")) {
      cleaned = digitsOnly.substring(3);
    }
    return cleaned.slice(0, 11);
  }, []);

  // ✅ Watch form changes with debounce - EXCLUDE password field
  useEffect(() => {
    const subscription = form.watch((value) => {
      // Create a copy without password to prevent it from being saved
      const { password, ...valuesWithoutPassword } = value;
      saveFormData(valuesWithoutPassword);
    });

    return () => {
      subscription.unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [form, saveFormData]);

  // ✅ Initialize form ONCE on mount
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      
      
      
      form.reset(defaultValues);
      setStoreSlug(storeSlug);
    }
  }, []); // ✅ Empty dependency array - only run once on mount

  // ✅ Handle auth state changes separately
  useEffect(() => {
    if (isUserLoggedIn && isInitializedRef.current) {
      const currentValues = form.getValues();
      form.reset({
        ...currentValues,
        name: loggedInUserName || currentValues.name,
        email: loggedInUserEmail || currentValues.email,
        phone: loggedInUserPhone || currentValues.phone,
      });
    }
  }, [isUserLoggedIn, loggedInUserName, loggedInUserEmail, loggedInUserPhone, form]);

  const watchedPassword = form.watch("password") || "";
  
  // ✅ FIXED: getButtonText is now just a string, not a function
  const getButtonText = useMemo(() => {
    if (isUserLoggedIn) return "Place Order";
    return watchedPassword && watchedPassword.length > 0 
      ? "Create Account & Place Order" 
      : "Place Order";
  }, [isUserLoggedIn, watchedPassword]);

  // ✅ FIXED: Create a separate function to get loading text
  const getLoadingText = useMemo(() => {
    if (isUserLoggedIn) return "Placing Order...";
    return watchedPassword && watchedPassword.length > 0 
      ? "Creating Account & Placing Order..." 
      : "Placing Order...";
  }, [isUserLoggedIn, watchedPassword]);

  if (authLoading) {
    return <CheckoutFormSkeleton />;
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Name Field */}
      <div className="grid gap-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          {...form.register("name")}
          placeholder="John Doe"
          disabled={isSubmitting}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      {/* Email + Phone fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            {...form.register("email")}
            placeholder="john.doe@example.com"
            type="email"
            disabled={isSubmitting}
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
            disabled={isSubmitting}
            onChange={(e) => {
              const formattedValue = formatPhoneNumber(e.target.value);
              form.setValue("phone", formattedValue, { shouldValidate: true });
            }}
          />
          {form.formState.errors.phone && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.phone.message}
            </p>
          )}
        </div>
      </div>

      {/* ✅ FIXED: Password section - Only for non-logged-in users */}
      {!isUserLoggedIn && (
        <div className="space-y-3">
          {!showPasswordField ? (
            <div className="flex justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPasswordField(true);
                  // Focus on password field when shown
                  setTimeout(() => {
                    const passwordInput = document.querySelector(
                      'input[name="password"]'
                    ) as HTMLInputElement;
                    if (passwordInput) {
                      passwordInput.focus();
                    }
                  }, 100);
                }}
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Password (Optional)
              </Button>
            </div>
          ) : (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Account Password (Optional)</Label>
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-blue-600 hover:text-blue-800 p-0 h-auto"
                  onClick={() => {
                    const currentPath = window.location.pathname;
                    const emailValue = form.getValues().email;
                    if (emailValue) {
                      window.location.href = `/${storeSlug}/login?redirect=${encodeURIComponent(
                        currentPath
                      )}&email=${encodeURIComponent(emailValue)}`;
                    } else {
                      window.location.href = `/${storeSlug}/login?redirect=${encodeURIComponent(
                        currentPath
                      )}`;
                    }
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
                  disabled={isSubmitting}
                  className="pr-10"
                  value={watchedPassword} // ✅ Controlled value
                  onChange={(e) => {
                    form.setValue("password", e.target.value, { shouldValidate: true });
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.password.message}
                </p>
              )}
              <PasswordStrength password={watchedPassword} />
              <p className="text-xs text-muted-foreground">
                Creating a password will save your information for faster checkout next time.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Address fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="country">Country</Label>
          <CountryFlag
            value={form.watch("country")}
            onValueChange={(value) => form.setValue("country", value)}
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
          disabled={isSubmitting}
        />
        {form.formState.errors.shippingAddress && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.shippingAddress.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full mt-6 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:from-yellow-500 hover:to-yellow-700 cursor-pointer transition-colors duration-300"
        disabled={isSubmitting || !form.formState.isValid}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-2">
            <SheiLoader
              size="sm"
              loaderColor="white"
              loadingText={getLoadingText}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            {!isUserLoggedIn && watchedPassword && watchedPassword.length > 0 && (
              <UserPlus className="h-4 w-4" />
            )}
            <ShoppingBag className="h-4 w-4" />
            {getButtonText}
            <ArrowRight className="h-4 w-4" />
          </div>
        )}
      </Button>
    </form>
  );
};

export default CheckoutForm;