"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheiLoader } from "../../../components/ui/SheiLoader/loader";
import { PasswordToggle } from "../../../components/common/PasswordToggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, ArrowLeft, LogIn } from "lucide-react";

interface PasswordStepProps {
  customerData: {
    email: string;
  };
  password: string;
  setPassword: (password: string) => void;
  onLogin: () => void;
  onBack: () => void;
  isLoggingIn: boolean;
}

export function PasswordStep({
  customerData,
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

  return (
    <Card className="shadow-lg border-border">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-500" />
        </div>
        <CardTitle className="text-2xl font-bold">
          Enter Password
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          For your account <strong className="text-foreground">{customerData.email}</strong>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-base font-semibold">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          <p className="text-sm text-muted-foreground">
            Enter the password for your account
          </p>
        </div>

        <div className="space-y-4">
          <Button
            type="button"
            onClick={onLogin}
            disabled={!password || password.length < 6 || isLoggingIn}
            className="w-full"
            variant={"greenish"}
          >
            {isLoggingIn ? (
              <>
                <SheiLoader size="sm" loaderColor="white" className="mr-2" />
                Logging in...
              </>
            ) : (
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                Login
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
            Use different email
          </Button>
        </div>

        <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800/30">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-green-800 dark:text-green-300">
            <CheckCircle className="h-4 w-4" />
            Account Verified
          </h4>
          <p className="text-xs text-green-700 dark:text-green-400">
            Your email has been verified in our system. Please enter your password to continue.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}