"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheiLoader } from "../../../components/ui/SheiLoader/loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, CheckCircle, UserPlus, Shield } from "lucide-react";

interface EmailStepProps {
  email: string;
  setEmail: (email: string) => void;
  onNext: () => void;
  onSignup: () => void;
  isCheckingEmail: boolean;
  storeSlug: string;
}

export function EmailStep({
  email,
  setEmail,
  onNext,
  onSignup,
  isCheckingEmail,
  storeSlug,
}: EmailStepProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onNext();
    }
  };

  return (
    <Card className="w-full max-w-xl shadow-xl border-border/40">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-chart-2/10 to-chart-2/20 rounded-full flex items-center justify-center">
          <Shield className="h-8 w-8 text-chart-2" />
        </div>
        <CardTitle className="text-2xl font-bold">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Enter your email to access your account
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-base font-semibold">
            Email Address
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="you@example.com"
              className="text-base pr-12"
              disabled={isCheckingEmail}
              autoFocus
            />
            <Button
              type="button"
              onClick={onNext}
              disabled={!email || !email.includes("@") || isCheckingEmail}
              className="absolute right-1 top-1 h-10 w-10 p-0"
              size="sm"
              variant={"greenish"}
            >
              {isCheckingEmail ? (
                <SheiLoader size="sm" loaderColor="white" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            We&apos;ll check if you have an existing account
          </p>
        </div>

        <div className="p-4 bg-chart-2/5 rounded-lg border border-chart-2/20">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-foreground">
            <CheckCircle className="h-4 w-4 text-chart-2" />
            What happens next:
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-chart-2"></div>
              We&apos;ll check your email in our system
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-chart-2"></div>
              If account exists, you&apos;ll enter password
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-chart-2"></div>
              If not, you&apos;ll be redirected to sign up
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