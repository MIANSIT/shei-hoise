/* eslint-disable @typescript-eslint/no-explicit-any */
// app/[store_slug]/signup/SignupForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import useCartStore from "@/lib/store/cartStore";
import { refreshCustomerData, clearCustomerCache } from "@/lib/hook/useCurrentCustomer";
import { signupQueries } from "@/lib/queries/customerAuth/customerSignup";
import { signUpSchema, SignUpFormValues } from "@/lib/utils/formSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button"
import { SheiLoader } from "../../components/ui/SheiLoader/loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserPlus, Shield, ArrowLeft } from "lucide-react";
import { SignupEmailStep } from "../../components/auth/Customer/SignupEmailStep";
import { SignupPasswordStep } from "../../components/auth/Customer/SignupPasswordStep";
import { SignupBenefitsCard } from "../../components/auth/Customer/SignupBenefitsCard";
import { supabase } from "@/lib/supabase";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const storeSlug = params.store_slug as string;
  const redirectParam = searchParams.get("redirect");
  const fromCheckout = searchParams.get("fromCheckout") === "true";
  
  const getRedirectUrl = () => {
    if (redirectParam) return redirectParam;
    if (fromCheckout) return `/${storeSlug}/checkout`;
    return `/${storeSlug}`;
  };
  
  const redirectTo = getRedirectUrl();
  const { success, error } = useSheiNotification();
  const { 
    formData, 
    setFormData, 
    clearFormData,
    setCreatedAccountEmail,
    clearAccountCreationFlags 
  } = useCheckoutStore();
  
  const { clearStoreCart } = useCartStore();
  
  const [isStoreLoaded, setIsStoreLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with Zod validation
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
    trigger,
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const email = watch("email");
  const password = watch("password");

  // Store current page
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("preSignupPage", window.location.pathname);
    }
  }, []);

  // Initialize and pre-fill email if exists in checkout store
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStoreLoaded(true);
      // Pre-fill email from checkout store if available
      if (formData.email) {
        setValue("email", formData.email, { shouldValidate: true });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [formData.email, setValue]);

  // Calculate password strength for additional validation
  const calculatePasswordStrength = (password: string): number => {
    if (!password) return 0;
    
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    
    return Object.values(checks).filter(Boolean).length;
  };

  // Clear all storage and cache
  const clearAllDataAndRefresh = async () => {
    try {
    
      clearStoreCart(storeSlug);
      
      clearFormData();
      
      clearCustomerCache();
      
      if (typeof window !== "undefined") {
        // Remove specific items
        localStorage.removeItem("user-information-storage");
        localStorage.removeItem("cart-storage");
        
        // Also clear any session storage
        sessionStorage.removeItem("checkout-data");
        sessionStorage.removeItem("customer-cache");
        sessionStorage.removeItem("preSignupPage");
      }
      
    } catch (err) {
      console.error("❌ Error clearing storage:", err);
    }
  };

  // Update user information store with new account email
  const updateUserInformationStore = (email: string) => {
    try {
      // Store the email in the checkout store for future use
      setCreatedAccountEmail(email);
      
      // Also update the formData with the email (so it appears in the header)
      setFormData({ 
        email: email,
        name: email.split("@")[0] // Auto-generate name from email for header display
      });
     
    } catch (err) {
      console.error("❌ Error updating user information store:", err);
    }
  };

  // Handle form submission
  const onSubmit = async (data: SignUpFormValues) => {
    // Additional password strength check
    const passwordStrength = calculatePasswordStrength(data.password);
    if (passwordStrength < 2) {
      error("Please choose a stronger password");
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if email exists
      const emailExists = await signupQueries.checkEmailExists(data.email);
      if (emailExists) {
        error("This email is already registered. Please login instead.");
        setIsSubmitting(false);
        return;
      }

      // Create auth user
      const authData = await signupQueries.createAuthUser(data.email, data.password);

      // Auto-login
      const loginData = await signupQueries.autoLogin(data.email, data.password);

      // Get store
      const store = await signupQueries.getStoreBySlug(storeSlug);
      
      if (!store) {
        throw new Error("Store not found");
      }

      // Create customer record
      const customer = await signupQueries.createCustomer(
        data.email, 
        authData.user?.id || loginData?.user?.id
      );

      // Create store-customer link
      if (customer) {
        await signupQueries.createStoreCustomerLink(customer.id, store.id);
      }

      // IMPORTANT: Update user information store BEFORE clearing cache
      updateUserInformationStore(data.email);
      
      // Clear all storage and cache
      await clearAllDataAndRefresh();

      // Force refresh customer data to update the header
      refreshCustomerData();

      // Get current Supabase session to ensure auth state is updated
      const { data: { session } } = await supabase.auth.getSession();
      success("Account created successfully! Welcome!", { duration: 2000 });

      // Clear account creation flags
      setTimeout(() => {
        clearAccountCreationFlags();
      }, 500);

      // Wait a bit for state updates and cache clearing to complete
      setTimeout(() => {
        // Get final redirect URL
        let finalRedirectUrl = redirectTo;
        if (typeof window !== "undefined") {
          const preSignupPage = sessionStorage.getItem("preSignupPage");
          if (preSignupPage && !preSignupPage.includes("/signup")) {
            finalRedirectUrl = preSignupPage;
          }
        }
        
        router.replace(finalRedirectUrl);
        
      }, 1000); // Increased delay to ensure all updates are processed

    } catch (err: any) {
      console.error("❌ Signup error:", err);
      
      if (err.message.includes("already registered")) {
        error("This email is already registered. Please login instead.");
      } else if (err.message.includes("Password should be at least 8 characters")) {
        error("Password must be at least 8 characters long");
      } else {
        error(err.message || "An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit(onSubmit)();
    }
  };

  // Manually set form values for controlled inputs
  const handleEmailChange = (value: string) => {
    setValue("email", value, { shouldValidate: true });
  };

  const handlePasswordChange = (value: string) => {
    setValue("password", value, { shouldValidate: true });
  };

  // Add confirmPassword to form data
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isFormComplete = isValid && passwordsMatch && password.length >= 6;

  if (!isStoreLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <SheiLoader size="lg" loaderColor="primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen w-full py-4">
      <Card className="w-full max-w-xl shadow-xl border-border/40">
        <CardHeader className="text-center space-y-4 px-8 pt-10">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-chart-2/10 to-chart-2/20 rounded-full flex items-center justify-center">
            <Shield className="h-10 w-10 text-chart-2" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Create Account
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Sign up to get started with your shopping
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 px-8 pt-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <SignupEmailStep
              email={email}
              setEmail={handleEmailChange}
              onKeyPress={handleKeyPress}
              disabled={isSubmitting}
              error={errors.email?.message}
            />

            <SignupPasswordStep
              password={password}
              setPassword={handlePasswordChange}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              onKeyPress={handleKeyPress}
              disabled={isSubmitting}
            />

            {/* Sign Up Button */}
            <Button
              type="submit"
              disabled={!isFormComplete || isSubmitting}
              className="w-full mt-6"
              variant={"greenish"}
            >
              {isSubmitting ? (
                <>
                  <SheiLoader size="sm" loaderColor="white" className="mr-3" />
                  <span className="text-base font-medium">Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-6 w-6 mr-3" />
                  <span className="text-base font-medium">Create Account</span>
                </>
              )}
            </Button>
          </form>

          <SignupBenefitsCard />
        </CardContent>

        <CardFooter className="flex flex-col gap-5 pt-8 pb-10 px-8 border-t border-border/40">
          <div className="text-center">
            <p className="text-base text-muted-foreground mb-4">
              Already have an account?
            </p>
            <Button
              type="button"
              onClick={() => {
                router.push(`/${storeSlug}/login`);
              }}
              variant="outline"
              className="w-full text-base"
            >
              Login Instead
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}