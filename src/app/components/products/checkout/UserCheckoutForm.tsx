/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheiLoader } from "../../ui/SheiLoader/loader";
import { customerCheckoutSchema, CustomerCheckoutFormValues } from "@/lib/schema/checkoutSchema";
import { CountryFlag } from "../../common/CountryFlag";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import { useEffect, useState, useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createCheckoutCustomer } from "@/lib/queries/customers/createCheckoutCustomer";
import { getCustomerByEmail } from "@/lib/queries/customers/getCustomerByEmail";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSupabaseAuth } from "@/lib/hook/userCheckAuth";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useOrderProcess } from "@/lib/hook/useOrderProcess";

interface CheckoutFormProps {
  onSubmit: (values: CustomerCheckoutFormValues) => void;
  isLoading?: boolean;
}

const CheckoutForm = ({ onSubmit, isLoading = false }: CheckoutFormProps) => {
  const { formData, setFormData } = useCheckoutStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { user: currentUser, loading: userLoading, error: userError, profile } = useCurrentUser();
  const { session, loading: authLoading } = useSupabaseAuth();
  
  const params = useParams();
  const router = useRouter();
  const store_slug = params.store_slug as string;

  // Order process hook
  const { processOrder, loading: orderLoading, error: orderError } = useOrderProcess(store_slug);

  // ✅ Initialize form FIRST
  const form = useForm<CustomerCheckoutFormValues>({
    resolver: zodResolver(customerCheckoutSchema),
    defaultValues: formData,
  });

  // ✅ Memoize computed values to prevent unnecessary re-renders
  const isLoadingAuth = authLoading || userLoading;
  const isUserLoggedIn = Boolean(currentUser && session);
  const isSubmitting = isLoading || isCreatingAccount || orderLoading;

  // ✅ Create clean boolean disabled states
  const disabledStates = useMemo(() => ({
    name: Boolean(isSubmitting || isUserLoggedIn),
    email: Boolean(isSubmitting || isUserLoggedIn),
    phone: Boolean(isSubmitting || (isUserLoggedIn && currentUser?.phone)),
    password: Boolean(isSubmitting),
    addressFields: Boolean(isSubmitting),
  }), [isSubmitting, isUserLoggedIn, currentUser?.phone]);

  // ✅ Handle auth errors gracefully - missing session is normal!
  useEffect(() => {
    if (userError) {
      const isMissingSessionError = 
        userError.message?.includes('Auth session missing') || 
        userError.name === 'AuthSessionMissingError';
      
      if (isMissingSessionError) {
        console.log('🔐 No auth session - user is not logged in (this is normal)');
        return;
      }
      
      console.error('User hook error:', userError);
    }
  }, [userError]);

  // ✅ UPDATED: Optimized auto-population with profile data
  useEffect(() => {
    // Only run if we're done loading and have changes to apply
    if (isLoadingAuth) return;

    // Scenario 1: User is logged in - populate with their data AND profile data
    if (isUserLoggedIn && currentUser) {
      console.log('Auto-populating form with user data and profile:', { 
        user: currentUser, 
        profile 
      });
      
      // Combine user data with profile data for address fields
      const userFormData: Partial<CustomerCheckoutFormValues> = {
        name: `${currentUser.first_name} ${currentUser.last_name || ''}`.trim(),
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        password: '********', // Placeholder for validation
        country: profile?.country || formData.country || '',
        city: profile?.city || formData.city || '',
        postCode: profile?.postal_code || formData.postCode || '',
        shippingAddress: profile?.address_line_1 || formData.shippingAddress || '',
      };
      
      // Only reset if there are actual changes to prevent loops
      const currentFormValues = form.getValues();
      const hasChanges = JSON.stringify(userFormData) !== JSON.stringify({
        ...currentFormValues,
        password: '********' // Normalize password comparison
      });

      if (hasChanges) {
        console.log('Resetting form with user and profile data');
        form.reset(userFormData);
        setFormData(userFormData as CustomerCheckoutFormValues);
      }
    } 
    // Scenario 2: Guest user - ensure form has stored data
    else if (!isUserLoggedIn && !isLoadingAuth) {
      const currentFormValues = form.getValues();
      const hasStoredData = Object.keys(formData).length > 0;
      
      if (hasStoredData && JSON.stringify(currentFormValues) !== JSON.stringify(formData)) {
        console.log('Resetting form with stored guest data');
        form.reset(formData);
      }
    }
  }, [currentUser, profile, isUserLoggedIn, isLoadingAuth, form, setFormData, formData]);

  // ✅ FIXED: Complete order creation in form submission
  const handleSubmit = async (values: CustomerCheckoutFormValues) => {
    setIsCreatingAccount(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Save form data to store
      setFormData(values);

      let customerId: string | undefined;

      // Scenario 1: User is already logged in
      if (isUserLoggedIn && currentUser) {
        customerId = currentUser.id;
        console.log('Using logged-in user account for order:', customerId);
        
        // Process order directly for logged-in users
        const result = await processOrder(values, customerId);
        
        if (result.success) {
          setSuccess(result.message || 'Order placed successfully!');
          // ✅ Call parent onSubmit to show payment modal or handle success
          onSubmit(values);
        } else {
          setError(result.error || 'Failed to place order');
        }
        return;
      }

      // Scenario 2: Try to auto-login first (if user might have account)
      try {
        console.log('Attempting auto-login...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (!error && data.user) {
          console.log('Auto-login successful');
          customerId = data.user.id;
          const result = await processOrder(values, customerId);
          
          if (result.success) {
            setSuccess(result.message || 'Order placed successfully!');
            onSubmit(values);
          } else {
            setError(result.error || 'Failed to place order');
          }
          return;
        }
        
        // If login fails, check if account exists
        const existingCustomer = await getCustomerByEmail(values.email);
        
        if (existingCustomer) {
          setError('The password you entered is incorrect. Please try again.');
          return;
        }

        // Scenario 3: No account exists - create new one
        console.log('Creating new customer account...');
        const customerData = { 
          ...values, 
          store_slug 
        };

        const result = await createCheckoutCustomer(customerData);
        console.log('Customer created successfully:', result);

        // Auto-login the new customer
        const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (signInError) {
          console.error('Auto-login error:', signInError);
          throw new Error(`Account created but login failed: ${signInError.message}`);
        }
        
        console.log('New customer auto-logged in');
        customerId = signInData.user.id;
        const orderResult = await processOrder(values, customerId);
        
        if (orderResult.success) {
          setSuccess(orderResult.message || 'Order placed successfully!');
          onSubmit(values);
        } else {
          setError(orderResult.error || 'Failed to place order');
        }
        
      } catch (processError: any) {
        console.error('Process error:', processError);
        setError(processError.message || 'Failed to process checkout. Please try again.');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      setError(error.message || 'Failed to process checkout. Please try again.');
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

  // Show loading while checking auth status
  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center py-8">
        <SheiLoader
          size="md"
          loadingText="Loading your information..."
        />
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Name (Full Width) */}
      <div className="grid gap-2">
        <Label htmlFor="name">
          Full Name 
        </Label>
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
          <Label htmlFor="email">
            Email 
          </Label>
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
          <Label htmlFor="phone">
            Phone Number
          </Label>
          <Input
            {...form.register("phone")}
            placeholder="+880-1833228622"
            type="tel"
            disabled={disabledStates.phone}
            className={isUserLoggedIn && currentUser?.phone ? "bg-muted cursor-not-allowed" : ""}
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
              <Label htmlFor="password">
                Account Password
              </Label>
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
          </div>
          <p className="text-xs text-muted-foreground">
            We&apos;ll automatically create your account or log you in if you already have one.
          </p>
        </div>
      )}

      {/* Address Fields - Always editable for shipping preferences */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="country">
            Country
          </Label>
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
          <Label htmlFor="city">
            City
          </Label>
          <Input
            {...form.register("city")}
            placeholder="New York"
            disabled={disabledStates.addressFields}
          />
          {form.formState.errors.city && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.city.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="postCode">
            Postal Code
          </Label>
          <Input
            {...form.register("postCode")}
            placeholder="10001"
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
        <Label htmlFor="shippingAddress">
          Shipping Address
        </Label>
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
          <SheiLoader
            size="sm"
            loaderColor="white"
            loadingText={
              isUserLoggedIn ? "Placing Order..." : 
              isCreatingAccount ? "Creating Account..." : "Processing..."
            }
          />
        ) : (
          isUserLoggedIn ? "Place Order" : "Place Order"
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