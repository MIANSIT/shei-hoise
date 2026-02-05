/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/components/products/checkout/UserCheckoutForm.tsx - SIMPLIFIED VERSION
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
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { ArrowRight, ShoppingBag } from "lucide-react";
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

// ✅ Simplified schema for checkout (phone-first, no email/password required)
const simplifiedCheckoutSchema = customerCheckoutSchema.omit({
  email: true,
  password: true,
});

const simplifiedCheckoutSchemaForLoggedIn = customerCheckoutSchemaForLoggedIn.omit({
  email: true,
  password: true,
});

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

  const { session, loading: authLoading } = useSupabaseAuth();
  const { formData, setFormData, setStoreSlug } = useCheckoutStore();

  const isUserLoggedIn = useMemo(() => Boolean(session), [session]);
  const isSubmitting = isLoading;

  const isInitializedRef = useRef(false);

  // User data
  const loggedInUserName = useMemo(() => {
    if (!session?.user?.user_metadata) return null;
    const meta = session.user.user_metadata;
    return meta.first_name
      ? `${meta.first_name} ${meta.last_name || ""}`.trim()
      : meta.full_name || null;
  }, [session]);

  const loggedInUserPhone = useMemo(
    () => session?.user?.user_metadata?.phone || null,
    [session],
  );

  // ✅ Simplified default values (no email, no password)
  const defaultValues = useMemo(() => {
    if (isUserLoggedIn) {
      return {
        name: loggedInUserName || "",
        phone: loggedInUserPhone || "",
        country: "Bangladesh",
        city: "Dhaka",
        postCode: "",
        shippingAddress: "",
        email: "", // Empty for logged-in users too
        password: "", // Always empty
      };
    }

    return {
      name: formData.name || "",
      phone: formData.phone || "",
      country: formData.country || "Bangladesh",
      city: formData.city || "Dhaka",
      postCode: formData.postCode || "",
      shippingAddress: formData.shippingAddress || "",
      email: "", // Always empty for guest
      password: "", // Always empty
    };
  }, [
    isUserLoggedIn,
    loggedInUserName,
    loggedInUserPhone,
    formData,
  ]);

  const formSchema = useMemo(
    () =>
      isUserLoggedIn
        ? simplifiedCheckoutSchemaForLoggedIn
        : simplifiedCheckoutSchema,
    [isUserLoggedIn],
  );

  const form = useForm<CustomerCheckoutFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Save function - only saves phone, name, and address
  const saveFormData = useCallback(
    (values: Partial<CustomerCheckoutFormValues>) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        setFormData({
          name: values.name || "",
          email: "", // Don't save email
          phone: values.phone || "",
          country: values.country || "Bangladesh",
          city: values.city || "Dhaka",
          shippingAddress: values.shippingAddress || "",
          postCode: values.postCode || "",
        });
      }, 1000);
    },
    [setFormData],
  );

  // Handle form submission
  const handleSubmit = useCallback(
    (values: CustomerCheckoutFormValues) => {
      // Always submit with empty email and password
      const submitValues = {
        ...values,
        email: "", // Always empty
        password: "", // Always empty
      };

      // Save to Zustand
      setFormData({
        name: values.name,
        email: "", // Don't save email
        phone: values.phone,
        country: values.country,
        city: values.city,
        shippingAddress: values.shippingAddress,
        postCode: values.postCode,
      });

      setStoreSlug(storeSlug);
      onSubmit(submitValues);
    },
    [onSubmit, setFormData, setStoreSlug, storeSlug],
  );

  // Phone formatting
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

  // Watch form changes - save data
  useEffect(() => {
    const subscription = form.watch((value) => {
      const { email, password, ...valuesToSave } = value;
      saveFormData(valuesToSave);
    });

    return () => {
      subscription.unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [form, saveFormData]);

  // Initialize form ONCE on mount
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;

      // Pre-fill phone from Zustand if available
      if (formData.phone) {
        form.setValue("phone", formData.phone);
      }

      form.reset(defaultValues);
      setStoreSlug(storeSlug);
    }
  }, []);

  // Handle auth state changes
  useEffect(() => {
    if (isUserLoggedIn && isInitializedRef.current) {
      const currentValues = form.getValues();
      form.reset({
        ...currentValues,
        name: loggedInUserName || currentValues.name,
        phone: loggedInUserPhone || currentValues.phone,
      });
    }
  }, [
    isUserLoggedIn,
    loggedInUserName,
    loggedInUserPhone,
    form,
  ]);

  const watchedPhone = form.watch("phone") || "";

  // Button text
  const getButtonText = useMemo(() => {
    return "Place Order";
  }, []);

  const getLoadingText = useMemo(() => {
    return "Placing Order...";
  }, []);

  if (authLoading) {
    return <CheckoutFormSkeleton />;
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Name Field */}
      <div className="grid gap-2">
        <Label htmlFor="name">Full Name *</Label>
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

      {/* Phone field - SIMPLE & PROMINENT */}
      <div className="grid gap-2">
        <Label htmlFor="phone" className="text-base font-semibold">
          Phone Number *
        </Label>
        <div className="relative">
          <Input
            {...form.register("phone")}
            placeholder="01XXXXXXXXX"
            type="tel"
            disabled={isSubmitting}
            onChange={(e) => {
              const formattedValue = formatPhoneNumber(e.target.value);
              form.setValue("phone", formattedValue, { shouldValidate: true });

              // Immediately save phone to Zustand
              saveFormData({
                ...form.getValues(),
                phone: formattedValue,
              });
            }}
            className="h-12 text-lg"
          />
        </div>
        {form.formState.errors.phone && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.phone.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          We&apos;ll use this to contact you about your order
        </p>
      </div>

      {/* Address fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="country">Country *</Label>
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
          <Label htmlFor="city">City *</Label>
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
        <Label htmlFor="shippingAddress">Shipping Address *</Label>
        <Input
          {...form.register("shippingAddress")}
          placeholder="House #123, Road #456, Area Name"
          disabled={isSubmitting}
          className="h-12"
        />
        {form.formState.errors.shippingAddress && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.shippingAddress.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Please provide detailed address for delivery
        </p>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full mt-6 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:from-yellow-500 hover:to-yellow-700 cursor-pointer transition-colors duration-300 h-14 text-lg font-semibold"
        disabled={isSubmitting || !form.formState.isValid}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-3">
            <SheiLoader
              size="sm"
              loaderColor="white"
              loadingText={getLoadingText}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <ShoppingBag className="h-5 w-5" />
            {getButtonText}
            <ArrowRight className="h-5 w-5" />
          </div>
        )}
      </Button>

      {/* ✅ Option to create account later */}
      <div className="text-center pt-2">
        <p className="text-sm text-muted-foreground">
          Want to save your details for faster checkout?{" "}
          <button
            type="button"
            onClick={() => {
              window.location.href = `/${storeSlug}/login?phone=${encodeURIComponent(watchedPhone)}`;
            }}
            className="text-blue-600 hover:text-blue-800 font-medium underline"
          >
            Create account later
          </button>
        </p>
      </div>
    </form>
  );
};

export default CheckoutForm;