// components/checkout/CheckoutForm.tsx
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
import { useCheckoutStore } from "../../../../lib/store/userInformationStore";
import { useEffect, useState, useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createCheckoutCustomer } from "@/lib/queries/customers/createCheckoutCustomer";
import { getCustomerByEmail } from "@/lib/queries/customers/getCustomerByEmail";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSupabaseAuth } from "@/lib/hook/userCheckAuth";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";

interface CheckoutFormProps {
  onSubmit: (values: CustomerCheckoutFormValues) => void;
  isLoading?: boolean;
}

const CheckoutForm = ({ onSubmit, isLoading = false }: CheckoutFormProps) => {
  const { formData, setFormData } = useCheckoutStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use your updated hook that includes profile data
  const { user: currentUser, loading: userLoading, error: userError, profile } = useCurrentUser();
  const { session, loading: authLoading } = useSupabaseAuth();
  
  const params = useParams();
  const store_slug = params.store_slug as string;

  // ✅ Initialize form FIRST
  const form = useForm<CustomerCheckoutFormValues>({
    resolver: zodResolver(customerCheckoutSchema),
    defaultValues: formData,
  });

  // ✅ Memoize computed values to prevent unnecessary re-renders
  const isLoadingAuth = authLoading || userLoading;
  const isUserLoggedIn = Boolean(currentUser && session);
  const isSubmitting = isLoading || isCreatingAccount;

  // ✅ Create clean boolean disabled states
  const disabledStates = useMemo(() => ({
    name: Boolean(isSubmitting || isUserLoggedIn),
    email: Boolean(isSubmitting || isUserLoggedIn),
    phone: Boolean(isSubmitting || (isUserLoggedIn && currentUser?.phone)),
    password: Boolean(isSubmitting),
    addressFields: Boolean(isSubmitting),
  }), [isSubmitting, isUserLoggedIn, currentUser?.phone]);

  // ✅ Extract form registration to separate variables AFTER form initialization
  const nameField = form.register("name");
  const emailField = form.register("email");
  const phoneField = form.register("phone");
  const passwordField = form.register("password");
  const cityField = form.register("city");
  const postCodeField = form.register("postCode");
  const shippingAddressField = form.register("shippingAddress");

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

  const handleSubmit = async (values: CustomerCheckoutFormValues) => {
    setIsCreatingAccount(true);
    setError(null);
    
    try {
      // Save form data to store
      setFormData(values);

      // Scenario 1: User is already logged in
      if (isUserLoggedIn) {
        console.log('Using logged-in user account for order');
        
        // For logged-in users, we don't need to validate password
        const orderData = {
          ...values,
          password: 'account-password-not-needed' // Bypass password validation
        };
        
        onSubmit(orderData);
        return;
      }

      // Scenario 2: Check if customer already exists
      const existingCustomer = await getCustomerByEmail(values.email);
      
      if (existingCustomer) {
        // Account exists - try to log them in with provided password
        try {
          console.log('Account exists, attempting auto-login...');
          const { data, error } = await supabase.auth.signInWithPassword({
            email: values.email,
            password: values.password,
          });

          if (error) {
            console.error('Login error:', error);
            if (error.message?.includes('Invalid login credentials')) {
              setError('The password you entered is incorrect. Please try again or use password reset.');
            } else {
              setError(`Login failed: ${error.message}`);
            }
            return;
          }
          
          console.log('Auto-login successful');
          
          // Wait a moment for auth state to update
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Proceed to payment with the form values
          onSubmit(values);
          return;
        } catch (loginError: any) {
          console.error('Login catch error:', loginError);
          setError('Login failed. Please try again.');
          return;
        }
      }

      // Scenario 3: No account exists - create new account
      console.log('Creating new customer account...');
      const customerData = {
        ...values,
        store_slug: store_slug
      };

      const result = await createCheckoutCustomer(customerData);
      console.log('Customer created successfully:', result);

      // Auto-login the new customer
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) {
        console.error('Auto-login error:', signInError);
        throw new Error(`Account created but login failed: ${signInError.message}`);
      }
      
      console.log('New customer auto-logged in');

      // Wait for auth state to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Proceed to payment
      onSubmit(values);
      
    } catch (error: any) {
      console.error('Failed in checkout process:', error);
      setError(error.message || 'Failed to process checkout. Please try again.');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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

  // ✅ DEBUG: Log current state
  console.log('🔐 CheckoutForm State:', {
    isUserLoggedIn,
    currentUser: currentUser?.email,
    profile: profile,
    session: !!session,
    authLoading,
    userLoading,
    userError: userError?.message,
    shouldShowForm: !isUserLoggedIn && !isLoadingAuth
  });

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Show message if user is already logged in */}
      {isUserLoggedIn && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">
            ✅ You are logged in as <strong>{currentUser!.email}</strong>. 
            Your account information will be used for this order.
          </p>
        </div>
      )}

      {/* Name (Full Width) */}
      <div className="grid gap-2">
        <Label htmlFor="name">
          Full Name 
          {isUserLoggedIn && <span className="text-muted-foreground text-sm ml-2">(From your account)</span>}
        </Label>
        <Input
          {...nameField}
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
            {isUserLoggedIn && <span className="text-muted-foreground text-sm ml-2">(Account email)</span>}
          </Label>
          <Input
            {...emailField}
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
            {isUserLoggedIn && currentUser?.phone && <span className="text-muted-foreground text-sm ml-2">(From your account)</span>}
          </Label>
          <Input
            {...phoneField}
            placeholder="+1 234 567 8900"
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

      {/* ✅ Password Field - Show for ALL unauthenticated users */}
      {!isUserLoggedIn && (
        <div className="grid gap-2">
          <Label htmlFor="password">
            Password <span className="text-sm text-muted-foreground">(For your account)</span>
          </Label>
          <div className="relative">
            <Input
              {...passwordField}
              placeholder="Create a password (min 8 characters)"
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
      )}

      {/* Address Fields - Always editable for shipping preferences */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="country">
            Country
            {isUserLoggedIn && (
              <span className="text-muted-foreground text-sm ml-2">
                {profile?.country ? '(From your profile)' : '(Shipping address)'}
              </span>
            )}
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
            {isUserLoggedIn && (
              <span className="text-muted-foreground text-sm ml-2">
                {profile?.city ? '(From your profile)' : '(Shipping address)'}
              </span>
            )}
          </Label>
          <Input
            {...cityField}
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
            {isUserLoggedIn && (
              <span className="text-muted-foreground text-sm ml-2">
                {profile?.postal_code ? '(From your profile)' : '(Shipping address)'}
              </span>
            )}
          </Label>
          <Input
            {...postCodeField}
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
          {isUserLoggedIn && (
            <span className="text-muted-foreground text-sm ml-2">
              {profile?.address_line_1 ? '(From your profile)' : '(Shipping address)'}
            </span>
          )}
        </Label>
        <Input
          {...shippingAddressField}
          placeholder="123 Main St, Apt 4B"
          disabled={disabledStates.addressFields}
        />
        {form.formState.errors.shippingAddress && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.shippingAddress.message}
          </p>
        )}
      </div>

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
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <SheiLoader
            size="sm"
            loaderColor="white"
            loadingText={
              isUserLoggedIn ? "Processing Order..." : 
              isCreatingAccount ? "Creating Account..." : "Processing..."
            }
          />
        ) : (
          isUserLoggedIn ? "Place Order with Account" : "Continue to Payment"
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