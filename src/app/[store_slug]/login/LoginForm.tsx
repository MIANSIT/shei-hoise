/* eslint-disable @typescript-eslint/no-explicit-any */
// app/[store_slug]/login/LoginForm.tsx - PRODUCTION READY PHONE-FIRST
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import { refreshCustomerData } from "@/lib/hook/useCurrentCustomer";
import { supabase } from "@/lib/supabase";
import { getCustomerByPhone } from "@/lib/queries/customers/getCustomerByPhone";
import { getCustomerByEmail, updateCustomerEmailByPhone } from "@/lib/queries/customers/getCustomerByEmail";
import { linkAuthToCustomer } from "@/lib/queries/customers/getCustomerByEmail";
import { 
  EmailOrPhoneStep, 
  PasswordStep, 
  EmailInputStep,
  LoadingStep 
} from "../../components/auth/Customer/LoginSteps";
import { SheiLoader } from "../../components/ui/SheiLoader/loader";

type LoginStep = "emailOrPhone" | "emailInput" | "password" | "loading";

interface CustomerData {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  auth_user_id: string | null;
  profile_id: string | null;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  
  const storeSlug = params.store_slug as string;
  const redirectParam = searchParams.get("redirect");
  const phoneFromParams = searchParams.get("phone");
  const emailFromParams = searchParams.get("email");
  
  const getRedirectUrl = () => {
    if (redirectParam) return redirectParam;
    return `/${storeSlug}`;
  };
  
  const redirectTo = getRedirectUrl();
  const { success, error, info } = useSheiNotification();
  const { formData, clearAccountCreationFlags } = useCheckoutStore();
  
  const [step, setStep] = useState<LoginStep>("emailOrPhone");
  const [inputValue, setInputValue] = useState("");
  const [inputType, setInputType] = useState<"email" | "phone">("phone"); // Default to phone
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  // Store current page as previous page
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("preLoginPage", window.location.pathname);
    }
  }, []);

  // Pre-fill from params or Zustand
  useEffect(() => {
    const timer = setTimeout(() => {
      if (phoneFromParams) {
        const cleanedPhone = phoneFromParams.replace(/\D/g, '');
        setInputValue(phoneFromParams);
        setPhoneNumber(cleanedPhone);
        setInputType("phone");
      } else if (emailFromParams) {
        setInputValue(emailFromParams);
        setInputType("email");
      } else if (formData.phone) {
        const cleanedPhone = formData.phone.replace(/\D/g, '');
        setInputValue(formData.phone);
        setPhoneNumber(cleanedPhone);
        setInputType("phone");
      } else if (formData.email) {
        setInputValue(formData.email);
        setInputType("email");
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [formData, phoneFromParams, emailFromParams]);

  // Function to detect if input is phone or email
  const detectInputType = (value: string): "email" | "phone" => {
    const phoneRegex = /^[0-9]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Remove spaces and special characters for phone check
    const cleanedValue = value.replace(/\D/g, '');
    
    if (phoneRegex.test(cleanedValue) && cleanedValue.length >= 10) {
      return "phone";
    } else if (emailRegex.test(value)) {
      return "email";
    }
    
    // Default to phone for Bangladesh
    return "phone";
  };

  // Clean phone number
  const cleanPhoneNumber = (phone: string): string => {
    return phone.replace(/\D/g, '').slice(0, 11);
  };

  // Handle email/phone submission
  const handleInputSubmit = async () => {
    if (!inputValue.trim()) {
      error("Please enter phone number or email");
      return;
    }

    setIsProcessing(true);
    setStep("loading");

    try {
      const detectedType = detectInputType(inputValue);
      
      if (detectedType === "phone") {
        // Handle phone number
        const cleanedPhone = cleanPhoneNumber(inputValue);
        setPhoneNumber(cleanedPhone);
        
        if (cleanedPhone.length !== 11) {
          error("Please enter a valid 11-digit phone number");
          setStep("emailOrPhone");
          setIsProcessing(false);
          return;
        }

        // Check if phone exists in database
        const customerByPhone = await getCustomerByPhone(cleanedPhone, storeSlug);
        
        if (customerByPhone) {
          // Phone found in database
          setCustomerData(customerByPhone);
          
          if (customerByPhone.email && customerByPhone.email.trim() !== "") {
            // Phone has email associated
            setEmail(customerByPhone.email);
            
            if (customerByPhone.auth_user_id) {
              // Account exists and has auth, go to password
              success("Account found! Please enter your password");
              setStep("password");
            } else {
              // Phone+email but no auth account
              info("Account needs setup. Please create a password.");
              setStep("password");
            }
          } else {
            // Phone found but no email - need to ask for email
            info("Please enter an email address for your account");
            setStep("emailInput");
          }
        } else {
          // Phone not found - treat as new user
          info("No account found with this phone number");
          setTimeout(() => {
            router.push(`/${storeSlug}/signup?phone=${encodeURIComponent(cleanedPhone)}`);
          }, 1000);
        }
      } else {
        // Handle email
        const customerByEmail = await getCustomerByEmail(inputValue, storeSlug);
        
        if (customerByEmail) {
          setCustomerData(customerByEmail);
          setEmail(customerByEmail.email);
          
          if (customerByEmail.auth_user_id) {
            success("Account found! Please enter your password");
            setStep("password");
          } else {
            info("Account found but needs setup");
            setStep("password");
          }
        } else {
          info("No account found with this email");
          setTimeout(() => {
            router.push(`/${storeSlug}/signup?email=${encodeURIComponent(inputValue)}`);
          }, 1000);
        }
      }
    } catch (err: any) {
      console.error("Error checking input:", err);
      error("Failed to check account. Please try again.");
      setStep("emailOrPhone");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle email input (for phone without email)
  const handleEmailSubmit = async () => {
    if (!email.trim() || !email.includes("@")) {
      error("Please enter a valid email address");
      return;
    }

    setIsProcessing(true);
    setStep("loading");

    try {
      // Check if email already exists in another account
      const existingCustomer = await getCustomerByEmail(email, storeSlug);
      
      if (existingCustomer) {
        // Email exists - check if it's the same customer
        if (customerData && existingCustomer.id === customerData.id) {
          // Same customer, just update email
          await updateCustomerEmailByPhone(phoneNumber, email);
          setCustomerData({ ...customerData, email });
          
          if (existingCustomer.auth_user_id) {
            success("Email updated! Please enter your password");
            setStep("password");
          } else {
            setStep("password");
          }
        } else {
          // Email belongs to different customer - ask what to do
          error("This email is already registered with another account");
          setStep("emailInput");
        }
      } else {
        // New email - update the phone record with this email
        if (customerData) {
          const updated = await updateCustomerEmailByPhone(phoneNumber, email);
          if (updated) {
            setCustomerData({ ...customerData, email });
            success("Email added to your account!");
            setStep("password");
          } else {
            throw new Error("Failed to update email");
          }
        }
      }
    } catch (err: any) {
      console.error("Error processing email:", err);
      error(err.message || "Failed to process email. Please try again.");
      setStep("emailInput");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle login/password submission
  const handleLogin = async () => {
    if (!password || password.length < 6) {
      error("Please enter your password (minimum 6 characters)");
      return;
    }

    setIsProcessing(true);

    try {
      const customerId = customerData?.id;

      // Check if auth account already exists
      if (customerData?.auth_user_id) {
        // Account exists - login
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase(),
          password: password,
        });

        if (authError) {
          if (authError.message.includes("Invalid login credentials")) {
            throw new Error("Invalid password. Please try again.");
          } else if (authError.message.includes("Email not confirmed")) {
            throw new Error("Please verify your email address before logging in.");
          } else {
            throw authError;
          }
        }

        success("Login successful!", { duration: 1000 });
        
      } else {
        // No auth account - sign up
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.toLowerCase(),
          password: password,
          options: {
            data: {
              phone: phoneNumber || customerData?.phone,
              role: "customer",
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (authError) {
          if (authError.message.includes("already registered")) {
            // Try to login instead
            const { error: loginError } = await supabase.auth.signInWithPassword({
              email: email.toLowerCase(),
              password: password,
            });
            
            if (loginError) throw loginError;
          } else {
            throw authError;
          }
        }

        if (authData.user) {
          // Link auth user to customer record
          if (customerId) {
            await linkAuthToCustomer(customerId, authData.user.id);
          }
          
          if (authData.user.identities && authData.user.identities.length === 0) {
            // User already existed in auth but wasn't linked
            success("Account linked successfully!", { duration: 1000 });
          } else {
            success("Account created and logged in!", { duration: 1000 });
          }
        }
      }

      refreshCustomerData();
      clearAccountCreationFlags();

      // Redirect
      setTimeout(() => {
        let finalRedirectUrl = redirectTo;
        if (typeof window !== "undefined") {
          const preLoginPage = sessionStorage.getItem("preLoginPage");
          if (preLoginPage && !preLoginPage.includes("/login")) {
            finalRedirectUrl = preLoginPage;
          }
        }
        router.push(finalRedirectUrl);
      }, 800);

    } catch (err: any) {
      console.error("Login error:", err);
      error(err.message || "Login failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle signup redirect
  const handleSignup = () => {
    const queryParams = new URLSearchParams();
    if (inputType === "phone" && phoneNumber) {
      queryParams.set("phone", phoneNumber);
    } else if (inputType === "email" && inputValue) {
      queryParams.set("email", inputValue);
    }
    
    router.push(`/${storeSlug}/signup?${queryParams.toString()}`);
  };

  // Reset to initial step
  const resetToInitial = () => {
    setStep("emailOrPhone");
    setPassword("");
    setCustomerData(null);
  };

  // Back to email input step
  const backToEmailInput = () => {
    setStep("emailInput");
  };

  return (
    <div className="max-w-md mx-auto w-full">
      {step === "emailOrPhone" && (
        <EmailOrPhoneStep
          inputValue={inputValue}
          setInputValue={setInputValue}
          inputType={inputType}
          setInputType={setInputType}
          onNext={handleInputSubmit}
          onSignup={handleSignup}
          isProcessing={isProcessing}
          storeSlug={storeSlug}
        />
      )}

      {step === "emailInput" && (
        <EmailInputStep
          phoneNumber={phoneNumber}
          email={email}
          setEmail={setEmail}
          onNext={handleEmailSubmit}
          onBack={resetToInitial}
          isProcessing={isProcessing}
        />
      )}

      {step === "password" && (
        <PasswordStep
          email={email}
          phone={customerData?.phone || phoneNumber}
          password={password}
          setPassword={setPassword}
          onLogin={handleLogin}
          onBack={customerData?.phone && (!customerData.email || customerData.email.trim() === "") ? backToEmailInput : resetToInitial}
          isLoggingIn={isProcessing}
        />
      )}

      {step === "loading" && (
        <LoadingStep
          message={isProcessing ? "Checking Your Account" : "Processing..."}
          description="Please wait a moment"
        />
      )}
    </div>
  );
}