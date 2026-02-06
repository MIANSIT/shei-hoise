// app/components/auth/Customer/LoginSteps.tsx - FIXED VERSION
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheiLoader } from "../../ui/SheiLoader/loader";
import { PasswordToggle } from "../../common/PasswordToggle";
import { PasswordStrength } from "../../common/PasswordStrength";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  ArrowLeft,
  LogIn,
  UserPlus,
  Shield,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  Smartphone,
} from "lucide-react";

// Step 1: Email or Phone Input
interface EmailOrPhoneStepProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  inputType: "email" | "phone";
  setInputType: (type: "email" | "phone") => void;
  onNext: () => void;
  onSignup: () => void;
  isProcessing: boolean;
  storeSlug: string;
}

export function EmailOrPhoneStep({
  inputValue,
  setInputValue,
  inputType,
  setInputType,
  onNext,
  onSignup,
  isProcessing,
  storeSlug,
}: EmailOrPhoneStepProps) {
  const [phoneInput, setPhoneInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  // Sync with parent component
  useEffect(() => {
    if (inputType === "phone") {
      setPhoneInput(inputValue);
    } else {
      setEmailInput(inputValue);
    }
  }, [inputValue, inputType]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onNext();
    }
  };

  const formatPhoneInput = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length <= 3) return digitsOnly;
    if (digitsOnly.length <= 6) return `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3)}`;
    if (digitsOnly.length <= 10) return `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 6)} ${digitsOnly.slice(6)}`;
    return `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 6)} ${digitsOnly.slice(6, 11)}`;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneInput(value);
    setPhoneInput(formatted);
    setInputValue(formatted);
  };

  const handleEmailChange = (value: string) => {
    setEmailInput(value);
    setInputValue(value);
  };

  const handleInputTypeChange = (type: "email" | "phone") => {
    setInputType(type);
    if (type === "phone") {
      setInputValue(phoneInput);
    } else {
      setInputValue(emailInput);
    }
  };

  const getInputValue = () => {
    return inputType === "phone" ? phoneInput : emailInput;
  };

  const isInputValid = () => {
    if (inputType === "phone") {
      const digitsOnly = phoneInput.replace(/\D/g, '');
      return digitsOnly.length === 11;
    } else {
      return emailInput.includes("@") && emailInput.includes(".");
    }
  };

  return (
    <Card className="w-full max-w-xl shadow-xl border-border/40">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-chart-2/10 to-chart-2/20 rounded-full flex items-center justify-center">
          <Smartphone className="h-8 w-8 text-chart-2" />
        </div>
        <CardTitle className="text-2xl font-bold">Access Your Account</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Enter your phone number or email to continue
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Input Type Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={inputType === "phone" ? "greenish" : "outline"}
            onClick={() => handleInputTypeChange("phone")}
            className="flex-1"
          >
            <Phone className="h-4 w-4 mr-2" />
            Phone
          </Button>
          <Button
            type="button"
            variant={inputType === "email" ? "greenish" : "outline"}
            onClick={() => handleInputTypeChange("email")}
            className="flex-1"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
        </div>

        {/* Input Field */}
        <div className="space-y-2">
          <Label htmlFor="input" className="text-base font-semibold">
            {inputType === "email" ? "Email Address" : "Phone Number"}
          </Label>
          <div className="relative">
            <Input
              id="input"
              type={inputType === "email" ? "email" : "tel"}
              value={getInputValue()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (inputType === "phone") {
                  handlePhoneChange(e.target.value);
                } else {
                  handleEmailChange(e.target.value);
                }
              }}
              onKeyPress={handleKeyPress}
              placeholder={inputType === "email" ? "you@example.com" : "01X XXX XXXX"}
              className="text-base pr-12"
              disabled={isProcessing}
              autoFocus
              maxLength={inputType === "phone" ? 15 : undefined} // Allow for spaces in phone
            />
            <Button
              type="button"
              onClick={onNext}
              disabled={!getInputValue().trim() || !isInputValid() || isProcessing}
              className="absolute right-1 top-1 h-10 w-10 p-0"
              size="sm"
              variant="greenish"
            >
              {isProcessing ? (
                <SheiLoader size="sm" loaderColor="white" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {inputType === "email" 
              ? "Enter the email used for your orders" 
              : "Enter your 11-digit Bangladeshi phone number (e.g., 01XXXXXXXXX)"}
          </p>
          {inputType === "phone" && phoneInput.replace(/\D/g, '').length > 0 && (
            <p className="text-xs text-muted-foreground">
              Digits entered: {phoneInput.replace(/\D/g, '').length}/11
            </p>
          )}
        </div>

        {/* Info Box */}
        <div className="p-4 bg-chart-2/5 rounded-lg border border-chart-2/20">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-foreground">
            <CheckCircle className="h-4 w-4 text-chart-2" />
            Phone-First Login
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-chart-2"></div>
              Most customers order with just phone number
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-chart-2"></div>
              If we find your phone, we&apos;ll check for email
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-chart-2"></div>
              No email? We&apos;ll ask you to add one
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-chart-2"></div>
              Then create password to secure your account
            </li>
          </ul>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 pt-6 border-t">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Don&apos;t have an account yet?
          </p>
          <Button
            type="button"
            onClick={onSignup}
            variant="outline"
            className="w-full"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create New Account
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

// Step 2: Email Input (for phone without email)
interface EmailInputStepProps {
  phoneNumber: string;
  email: string;
  setEmail: (email: string) => void;
  onNext: () => void;
  onBack: () => void;
  isProcessing: boolean;
}

export function EmailInputStep({
  phoneNumber,
  email,
  setEmail,
  onNext,
  onBack,
  isProcessing,
}: EmailInputStepProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onNext();
    }
  };

  const formatPhoneDisplay = (phone: string) => {
    if (phone.length === 11) {
      return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
    }
    return phone;
  };

  return (
    <Card className="shadow-lg border-border">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-full flex items-center justify-center">
          <Mail className="h-8 w-8 text-blue-600 dark:text-blue-500" />
        </div>
        <CardTitle className="text-2xl font-bold">Add Email Address</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          We found your orders with phone number
        </CardDescription>
        <div className="text-lg font-semibold text-foreground">
          {formatPhoneDisplay(phoneNumber)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-500 mt-0.5" />
            <div>
              <p className="text-foreground text-sm font-medium">
                Email Required for Account
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                We need an email address to create your account. This will be used for login and notifications.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-base font-semibold">
            Your Email Address
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="you@example.com"
              className="h-12 text-base pr-12"
              disabled={isProcessing}
              autoFocus
            />
            <Button
              type="button"
              onClick={onNext}
              disabled={!email || !email.includes("@") || isProcessing}
              className="absolute right-1 top-1 h-10 w-10 p-0"
              size="sm"
              variant="greenish"
            >
              {isProcessing ? (
                <SheiLoader size="sm" loaderColor="white" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter a valid email you have access to
          </p>
        </div>

        <div className="space-y-4">
          <Button
            type="button"
            onClick={onNext}
            disabled={!email || !email.includes("@") || isProcessing}
            className="w-full"
            variant="greenish"
          >
            {isProcessing ? (
              <>
                <SheiLoader size="sm" loaderColor="white" className="mr-2" />
                Processing...
              </>
            ) : (
              "Continue to Password"
            )}
          </Button>

          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Use different phone number
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 3: Password Input
interface PasswordStepProps {
  email: string;
  phone: string;
  password: string;
  setPassword: (password: string) => void;
  onLogin: () => void;
  onBack: () => void;
  isLoggingIn: boolean;
}

export function PasswordStep({
  email,
  phone,
  password,
  setPassword,
  onLogin,
  onBack,
  isLoggingIn,
}: PasswordStepProps) {
  const [showPassword, setShowPassword] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onLogin();
    }
  };

  const formatPhoneDisplay = (phone: string) => {
    if (phone.length === 11) {
      return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
    }
    return phone;
  };

  return (
    <Card className="shadow-lg border-border">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-500" />
        </div>
        <CardTitle className="text-2xl font-bold">Enter Password</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Login to your account with your secured password
        </CardDescription>
        <div className="text-sm text-muted-foreground">
          Email: <strong className="text-foreground">{email}</strong>
          {phone && (
            <span className="block mt-1">
              Phone: <strong>{formatPhoneDisplay(phone)}</strong>
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-base font-semibold">
            Password (min. 8 characters)
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="••••••••"
              className="h-12 text-base pr-12"
              disabled={isLoggingIn}
              autoFocus
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <PasswordToggle
                show={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
                size={20}
                className="hover:bg-accent/20"
              />
            </div>
          </div>
          
          {/* ✅ Added Password Strength Checker */}
          <PasswordStrength password={password} />
          
          <p className="text-sm text-muted-foreground">
            Enter password to access your account
          </p>
        </div>

        <div className="space-y-4">
          <Button
            type="button"
            onClick={onLogin}
            disabled={!password || password.length < 6 || isLoggingIn}
            className="w-full"
            variant="greenish"
          >
            {isLoggingIn ? (
              <>
                <SheiLoader size="sm" loaderColor="white" className="mr-2" />
                Entering Account...
              </>
            ) : (
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                 Continue
              </div>
            )}
          </Button>

          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800/30">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-green-800 dark:text-green-300">
            <CheckCircle className="h-4 w-4" />
            Almost Done!
          </h4>
          <p className="text-xs text-green-700 dark:text-green-400">
            After creating your password, you&apos;ll be able to:
          </p>
          <ul className="text-xs text-green-700 dark:text-green-400 mt-1 space-y-1">
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-green-500"></div>
              View all your past orders
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-green-500"></div>
              Track order status
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-green-500"></div>
              Faster checkout next time
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 4: Loading Step
interface LoadingStepProps {
  message?: string;
  description?: string;
}

export function LoadingStep({ 
  message = "Processing...", 
  description = "Please wait a moment" 
}: LoadingStepProps) {
  return (
    <Card className="shadow-lg border-border">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto">
          <SheiLoader size="lg" loaderColor="primary" />
        </div>
        <CardTitle className="text-xl font-bold">
          {message}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center pt-6">
        <p className="text-muted-foreground">
          {message.includes("Checking") 
            ? "Looking up your account in our system..." 
            : "Setting up your account..."}
        </p>
      </CardContent>
    </Card>
  );
}